# 租户读写隔离实施计划

> **执行交接：** 按下列任务顺序逐项实施并勾选；当前授权仅覆盖计划编写。实施时不得新增单元测试、依赖、Git 提交/分支/worktree 或启动服务。

**Goal:** 为数据批次与上传、流水线任务及其输入/运行记录、相关仪表盘统计增加基于可信租户身份的读写隔离。

**Architecture:** 每次认证请求都从数据库中的当前用户记录解析并校验租户，将有效租户放入服务端主体；业务请求不能指定租户。批次和流水线根记录持久化 `tenant_id`，子记录通过已校验父记录获得归属，查询在分页、计数和任何副作用前按租户收窄。扩展表结构先保持兼容；存量无法证明的记录留在隔离区，不推定为平台租户。

**Tech Stack:** Java 17、Spring Boot、MyBatis-Plus、PostgreSQL、现有 RabbitMQ 与对象存储设施。

**Spec:** [共同需求](../../inputs/requirements.md) · [共同源码事实](../../inputs/source-evidence.md)

## Global Constraints

- 保留现有 HTTP 形状、功能权限、个人和状态限制、分页默认值、流水线状态机、重试/幂等语义、消息协议和对象存储策略。
- 租户来自当前已认证用户数据库记录；不接受请求参数或 JWT 租户声明。`tenant_id = 0` 是有效且独立的平台业务空间；父、子租户按精确 ID 隔离；空值和无效租户拒绝。
- 更新不得转移批次或任务归属。外租户对象 ID 与不存在对象沿用同一既有错误路径。
- 遵循现有 `controller → service → manage → mapper` 分层；业务校验/事务留在 service，复杂可复用 SQL 留在 manage/mapper。不要增加全局 SQL 拦截器或跨域通用租户框架。
- 不新增单元测试；允许为现有测试更新已变更的调用或 fixture。离线回归复用已有用例。真实 HTTP、消息、对象存储验收只用未来获准的非生产 fixture 手工复演。
- 不扩大到数据源、公共目录、Worker 协议或 UI。只有确认直接触达本题受保护对象的既有旁路才纳入。

## Review Focus

- **平台 `0`、父子租户和同权限伙伴：** 以 `0`、父租户、子租户及 A 租户伙伴身份运行 Task 7 的读写复演，确认只命中精确租户且原功能权限仍生效。
- **上传 ID 错配与副作用：** 在 Task 3 用 A 的文件/会话 ID 配 B 的批次 ID，覆盖分片、ZIP、预览、下载与删除；确认既有错误且数据库、消息、对象存储均无新增副作用。
- **混合批次绑定：** 在 Task 4 用 A 的任务同时绑定 A、B 批次；确认整组拒绝、没有部分绑定或运行消息。
- **异步父子错配和重复投递：** 在 Task 5 复演跨父任务 ID、错执行 ID/版本、正常重复事件；确认错配不改状态，合法重复仍幂等。
- **未归属存量和旧写入：** 在 Task 6 对 null/冲突记录和仍活动的旧写入方做切换演练；确认不默认平台、未隔离冲突时不启用。

---

### Task 1: 建立可信的当前租户身份

**Files:**
- Modify `backend/business/business-auth/src/main/java/com/orvx/business/auth/security/DatabaseUserPrincipal.java`
- Modify `backend/business/business-auth/src/main/java/com/orvx/business/auth/security/DatabaseUserDetailsService.java`
- Modify `backend/business/business-auth/src/main/java/com/orvx/business/auth/security/jwt/JwtAuthenticationProvider.java`
- Modify `backend/business/business-auth/src/main/java/com/orvx/business/auth/service/impl/AuthServiceImpl.java`
- Create `backend/business/business-auth/src/main/java/com/orvx/business/auth/service/TenantIdentityService.java`
- Create `backend/business/business-auth/src/main/java/com/orvx/business/auth/service/impl/TenantIdentityServiceImpl.java`

**Interface:** `Long requireActiveTenantId(UserPO user)` 校验并返回数据库用户当前 `tenantId`。`DatabaseUserPrincipal.tenantId()` 只从认证链路持有；业务控制器保留已有 userId 用法并从该主体读取 tenantId。

- [ ] **Step 1: 增加唯一的租户身份校验。** `TenantIdentityServiceImpl` 通过现有 `TenantManage` 实现 `requireActiveTenantId(UserPO)`；接口 JavaDoc 说明用途、`UserPO` 参数和有效租户 ID 返回值。缺失或负值按现有认证拒绝异常处理；`0` 直接作为有效平台空间；正值必须对应未软删除且未停用的租户。沿用 `AuthServiceImpl` 当前错误定义，不把租户 ID 放进 JWT。
- [ ] **Step 2: 将解析结果接入认证主体。** `DatabaseUserDetailsService` 与 `JwtAuthenticationProvider` 基于各自从数据库取得的 `UserPO` 填充主体租户；JWT 每次认证都重新读取用户并校验当前租户，不信任令牌中的旧租户。更新主体现有构造点，不改变 userId、角色及权限集合。
- [ ] **Step 3: 复用同一校验处理登录和续期。** `AuthServiceImpl` 的登录、续期在签发/轮换令牌前调用该校验，删除或收敛已有重复的私有租户状态分支；用户停用检查保留。
- [ ] **Step 4: 核对权限与身份边界。** 静态检查 `tenantId` 不可由请求绑定或令牌声明覆盖；现有 `@PreAuthorize` 与超级管理员方法权限行为不变，后者不绕过业务查询的租户条件。

### Task 2: 隔离批次及其数据库访问

**Files:**
- Modify `scripts/java-sqls/schema/002-data-source.sql`
- Modify `backend/foundation/foundation-entity/src/main/java/com/orvx/foundation/entity/domain/po/DataBatchPO.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/DataBatchManage.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/DataBatchMapper.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/BatchFileManage.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/BatchFileMapper.java`
- Modify `backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/controller/DataBatchController.java`
- Modify `backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/DataBatchService.java`
- Modify `backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/impl/DataBatchServiceImpl.java`

**Interface:** 批次 service 的每个受保护读写入口都显式接收服务端 `tenantId`；例如 `createBatch(param, userId, tenantId)`、`listBatches(param, tenantId)`、`existsByName(name, excludeBatchId, tenantId)`。HTTP 参数和响应形状保持原样。

- [ ] **Step 1: 在批次根记录保存租户。** 为 `orvx_data_batch` 与 `DataBatchPO` 增加可空 `tenant_id`；新建时从认证主体写入，不采纳 Param 中同名字段；更新路径不赋值/覆盖此列。引导 schema 的名称唯一索引改为 `(tenant_id, batch_name)`，不设 `DEFAULT 0`。
- [ ] **Step 2: 使批次访问查询先按租户收窄。** `DataBatchManage` 与自定义 mapper 查询为列表、分页总数、详情、名称检查、更新/删除条件补上精确 `tenant_id`，再应用现有个人、状态、数据域条件。上传轮次、文件清单、计数和详情通过批次父记录过滤；分页发生在过滤之后。外租户与不存在 ID 使用同一路径。
- [ ] **Step 3: 把可信租户传入既有 HTTP/service 边界。** `DataBatchController` 受保护方法从主体读取 tenantId 并传给 service；列表、详情、名称检查、创建/重命名、上传轮次、验证、归档、删除等调用均覆盖。保留当前 `userId` 审计与个人限制、功能权限和状态检查。
- [ ] **Step 4: 先授权父子关系，再签发能力或产生副作用。** 批次文件列表/预览/下载 URL、文件 ID、upload ID、校验和删除先确认批次 tenant 与 `batch_id`/`upload_id` 关系；确认失败时不签发 URL、不改数据库、不触碰对象存储。删除仍使用 `BatchFileManage` 的全局物理对象引用保护。
- [ ] **Step 5: 检查租户内名称竞争。** 通过复用数据库唯一索引保证并发创建/重命名唯一；确认重命名只改名称，不改变归属，也不放宽既有错误响应形状。

### Task 3: 封闭分片、ZIP 和文件回调旁路

**Files:**
- Modify `scripts/java-sqls/schema/003-file-chunk-upload.sql`
- Modify `backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/controller/FileUploadController.java`
- Modify `backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/impl/ChunkUploadServiceImpl.java`
- Modify `backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/impl/ArchiveUploadServiceImpl.java`
- Modify `backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/support/ArchiveUploadTaskExecutor.java`
- Modify `backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/impl/FileUploadServiceImpl.java`
- Modify `backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/schedule/ChunkUploadCleanupScheduler.java`
- Modify the existing `orvx_file_chunk_upload` PO under `backend/foundation/foundation-entity/src/main/java/com/orvx/foundation/entity/domain/po/` and its mapper/manage under `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/`

- [ ] **Step 1: 持久化分片会话租户。** 为 `orvx_file_chunk_upload` 加 nullable `tenant_id`；把全局 `file_id` 唯一索引改为 `(tenant_id, file_id)`，对应会话 PO/查询一并更新。新会话的租户取自已校验批次；分片明细继续通过会话 `upload_id` 关联，不增加冗余租户字段。
- [ ] **Step 2: 在分片操作前校验完整父链。** 初始化先验证当前租户批次，再处理 MD5 或创建会话；part/status/merge/cancel 先按 tenant 加载会话，并核对 `batch_id`、`batch_file_id` 与批次/文件关系，然后才读写分片、改变状态或调用对象存储。A 的 MD5 命中不得向 B 返回命中或创建跨租户引用；同租户复用保留，历史共享对象仍走全局引用保护。
- [ ] **Step 3: 保护 ZIP 结果和后台执行。** `ArchiveUploadServiceImpl` 的创建、结果轮询和取消按持久父批次及任务 ID 关系校验；`ArchiveUploadTaskExecutor` 在异步存储操作前从父批次恢复租户并确认其 ID 关系，不依赖 `creatorId` 推定归属。
- [ ] **Step 4: 保护状态回调与定时清理。** 文件回调按文件父批次更新；清理任务只处理满足既有过期条件且会话/文件/批次关系自洽的记录，不能跨批次取消有效会话。保留现有状态机和清理周期。
- [ ] **Step 5: 清点端到端拒绝点。** 用静态调用链确认每个返回临时 URL、写行、改状态或操作对象存储的入口都在副作用前完成父子校验；外租户与不存在对象使用既有拒绝路径。

### Task 4: 隔离流水线任务、输入绑定和可见子记录

**Files:**
- Modify `scripts/java-sqls/schema/004-pipeline.sql`
- Modify `backend/foundation/foundation-entity/src/main/java/com/orvx/foundation/entity/domain/po/PipelineTaskPO.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/PipelineTaskManage.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/PipelineTaskDataBatchManage.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/PipelineStageTaskManage.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/PipelineTaskLogManage.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/PipelineStageQualityGateResultManage.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/PipelineStageQualityGateResultExecutionTaskManage.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/PipelineTaskMapper.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/PipelineTaskDataBatchMapper.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/PipelineStageTaskMapper.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/PipelineTaskLogMapper.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/PipelineStageQualityGateResultMapper.java`
- Modify `backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/PipelineStageQualityGateResultExecutionTaskMapper.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/controller/PipelineLifecycleController.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/controller/PipelineConfigurationController.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/controller/PipelineStageExecutionController.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/controller/PipelineTaskLogController.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/service/PipelineLifecycleService.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/service/PipelineConfigurationService.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/service/PipelineStageExecutionQueryService.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/service/PipelineTaskLogService.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/service/impl/PipelineLifecycleServiceImpl.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/service/impl/PipelineConfigurationServiceImpl.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/service/impl/PipelineStageExecutionQueryServiceImpl.java`
- Modify `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/service/impl/PipelineTaskLogServiceImpl.java`
- Modify `backend/business/business-governance-execution/src/main/java/com/orvx/business/governance/execution/service/PipelineExecutionService.java` and `PipelineParseExecutionRetryService.java`
- Modify `backend/business/business-governance-execution/src/main/java/com/orvx/business/governance/execution/service/impl/PipelineExecutionServiceImpl.java` and `PipelineParseExecutionRetryServiceImpl.java`

**Interface:** 新建 service 入口接收 `(existingRequest, userId, tenantId)`；受保护的查询/变更入口接收 `tenantId`。控制器通过认证主体表达式取得服务端 tenantId，不新增 HTTP 字段。

- [ ] **Step 1: 在流水线根记录固定创建时租户。** 为 `orvx_pipeline_task` 与 `PipelineTaskPO` 增加 nullable `tenant_id`；创建时从主体写入，之后禁止转移。不要从 `created_by` 的当前租户推断历史/既有任务归属。
- [ ] **Step 2: 限定任务根和所有子记录入口。** `PipelineTaskManage` 的分页、详情和状态变更按 tenant 查询；阶段、执行记录、日志、绑定、`raw_file` 及详情链接必须先通过 tenant 范围内的任务父记录，再按原父子 ID 关系加载。自定义 SQL 补齐租户条件，不依赖单列外键替代跨表一致性校验。
- [ ] **Step 3: 使绑定全有或全无。** 创建、替换输入和重试前一次性校验全部批次归属、批次类型及现有业务限制；任一 ID 外租户或不存在，整组按既有错误路径拒绝。校验须早于绑定写入、状态变更与消息发布，事务内保留原有锁/唯一约束语义。
- [ ] **Step 4: 覆盖每个 HTTP 入口。** 生命周期、配置、阶段详情/执行、运行/暂停/重启/重试、任务日志等入口将可信 tenantId 传到 service；列表/详情、预签名 artifact/source URL、执行记录始终从已授权根任务派生。保留现有权限注解和任务状态校验。
- [ ] **Step 5: 编译性更新既有用例。** 只更新当前已有 pipeline/execution 测试的 service 调用、mock 和必要 fixture 以匹配接口/字段；不添加新测试方法或测试类。

### Task 5: 恢复异步归属并隔离仪表盘/回读路径

**Files:**
- Modify `backend/business/business-governance-execution/src/main/java/com/orvx/business/governance/execution/listener/ExecutionEventListener.java`
- Modify `backend/business/business-governance-execution/src/main/java/com/orvx/business/governance/execution/processor/ExecutionEventProcessor.java`
- Modify `backend/business/business-governance-execution/src/main/java/com/orvx/business/governance/execution/service/ExecutionEventService.java`
- Modify `backend/business/business-governance-execution/src/main/java/com/orvx/business/governance/execution/service/impl/ExecutionEventServiceImpl.java`
- Audit `backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/service/impl/PipelineLifecycleServiceImpl.java` and the existing publisher/after-commit path only if it bypasses the scoped service
- Modify `backend/business/business-dashboard/src/main/java/com/orvx/business/dashboard/controller/DashboardController.java`
- Modify `backend/business/business-dashboard/src/main/java/com/orvx/business/dashboard/service/DashboardService.java`
- Modify `backend/business/business-dashboard/src/main/java/com/orvx/business/dashboard/service/impl/DashboardServiceImpl.java`
- Modify related dashboard data-access calls under `foundation-db`
- Audit only direct reads of protected batch/task/file IDs from `business-data-asset` and `business-annotation`

- [ ] **Step 1: 从持久父记录恢复异步归属。** 事件消费者用现有 `pipelineTaskId` 锁定并读取任务根及其 `tenant_id`，核验消息中的 task/stage/execution IDs、父子关系、运行版本、执行版本和序列后再写状态/记录或生成访问链接。保留当前重复投递幂等与异常重试语义。
- [ ] **Step 2: 不改变消息协议。** 不增加租户消息字段、不改 topic/routing、Worker 协议或发布时序；异步服务只从持久父记录恢复可信租户。旧消费者处理中的消息全部在切换前排空。
- [ ] **Step 3: 过滤相关仪表盘统计。** `DashboardController` 从认证主体读取 tenantId 并传给 `DashboardService`；对本题范围内的批次数、流水线数、阶段/待办/近期活动及直接 `Manage` 聚合查询在 count/group/page 前按精确租户过滤。VO、指标口径、其它独立域保持原样。
- [ ] **Step 4: 审计真实回读旁路。** 检查 asset/annotation 只读链路是否用本题的 batch/task/file ID 直接查询或签发 URL；仅对确认的旁路补用既有受保护 service/父记录校验，并记录路径。没有触达本题对象的域不扩改。

### Task 6: 编写可分阶段执行的存量升级与切换

**Files:**
- Modify bootstrap schemas `scripts/java-sqls/schema/002-data-source.sql`, `003-file-chunk-upload.sql`, `004-pipeline.sql` as specified above
- Create `scripts/java-sqls/upgrade/026-tenant-read-write-isolation.sql`

- [ ] **Step 1: 在升级脚本中添加兼容列与索引。** 为批次、流水线任务和分片会话新增 nullable `tenant_id`；创建批次 `(tenant_id, batch_name)`、会话 `(tenant_id, file_id)` 唯一索引后再移除旧全局名称/MD5 唯一索引。不给既有行填 `0`，不改 HTTP 或消息契约。
- [ ] **Step 2: 只从可证明证据回填。** 批次不得用 `creator_id` 当前所属租户推断创建时租户；只采纳可证实的创建时归属。流水线任务可由其全部可信批次父关系一致地继承租户，否则列为未归属/冲突。上传轮次、文件由父批次继承；分片会话还须核对 `batch_id` 与 `batch_file_id`。输出分组计数和只含记录 ID/原因的待处置清单，不搬移/删除对象。
- [ ] **Step 3: 隔离未证明记录。** 回填不确定或关系冲突记录保留 `tenant_id IS NULL`，由运行查询默认不可见；不得归入平台或父/子租户。需要赋值时先有可审计证据并检查租户内名称冲突。切换前逐项确认冲突已解决，或列入明确的隔离处置清单。
- [ ] **Step 4: 先停旧写入，再切换。** 准备阶段可先完成离线构建与脚本审查；切换窗口停止旧后端写入和旧 MQ 消费者，暂停上传/流水线写入并排空队列及活动分片会话，等待既有临时访问链接按原有效期失效，再运行 backfill/冲突报告、升级 SQL 与新版本。不得在旧写入方仍活动时启用新版本。
- [ ] **Step 5: 写明失败隔离边界。** 升级或冲突检查失败时不路由新业务流量；切换后发现问题时保持租户过滤并关闭受影响入口，保留新增 schema 和未归属隔离记录。禁止回退到可跨租户读取的旧版本；排查并修复后再恢复流量。
- [ ] **Step 6: 将启用条件记录在交接结果。** 所有新写入均写 tenantId；旧写入方已停止；旧消息/上传已排空；新索引生效；所有可回填记录通过父链校验；未证明/冲突记录已单列且不会被平台查询；功能与规范审查通过。未满足任一项时先安排后续处置，不启用隔离流量。

### Task 7: 离线回归、验收复演与统一审查

**Files:** 不新增文件或测试；仅在实现需要时更新 Task 4 指定的既有测试调用点。

- [ ] **Step 1: 编译受影响模块。** 在离线 Maven/Java 17 环境运行：

```bash
mvn -o -B -f backend/pom.xml -pl business/business-auth,business/business-data-manager,business/business-dashboard,business/business-governance-pipeline,business/business-governance-execution -am -DskipTests package
```

期望：所有目标模块及依赖模块编译成功。

- [ ] **Step 2: 运行现有认证与隔离相关回归。** 先运行认证模块已有测试：

```bash
mvn -o -B -f backend/pom.xml -pl business/business-auth -am test
```

再运行共同源码事实中的现有流水线/执行回归：

```bash
mvn -o -B -f backend/pom.xml -pl business/business-governance-pipeline,business/business-governance-execution -am -Dtest=PipelineLifecycleServiceImplTest,PipelineConfigurationServiceImplTest,ExecutionEventProcessorTest -Dsurefire.failIfNoSpecifiedTests=false test
```

期望：既有用例通过；不新增单元测试。数据管理模块无既有 `src/test`，不以新测试作为交接条件。

- [ ] **Step 3: 用未来获准的非生产 fixture 手工复演。** 预置同权限用户 A/B（不同 tenant）、A 的伙伴、平台 `0`、父/子租户；分别记录请求、统一错误响应、SQL 前后行数、MQ 入/出队、对象存储 key/对象数：
  - 批次列表/分页总数/名称检查/详情：A 仅见 A，B 仅见 B；同名 A/B 可各自创建；创建忽略客户端租户值，更新不能改归属；伙伴权限有效但仍限 A；父子互不可见。
  - 把 B 的批次 ID 配 A 的文件、upload、分片、ZIP task ID，覆盖 init/part/status/merge/cancel/校验/预览/下载/删除；均沿用既有拒绝路径，失败前后无数据库、消息或对象存储副作用。A/B 相同 MD5 不产生跨租户引用；历史共享对象仅在全局最后引用删除时物理清理。
  - A 创建任务后绑定 `[A批次, B批次]`，请求整组拒绝且绑定行、任务状态与消息不变；同租户合法多批次绑定仍可运行。外租户 task ID 的详情、阶段/日志/执行记录及 URL 与不存在对象表现相同。
  - 对异步事件注入错 task/stage/execution 组合及错误 run/execution version，确认记录/状态不变；再投递合法事件两次，确认正常推进且重复幂等。
  - 检查 dashboard 的批次/任务/阶段聚合按 A/B 分离；准备一个 tenant_id 未证明记录及一个关系冲突记录，确认查询不可见、升级报告列出且没有写成 `0`。故意保持一个旧 writer 活动时，切换 gate 必须拒绝启用。

  当前缺少获准 fixture/联调环境时，只记录该组“未验证”及所缺环境；不启动服务，不把离线结果冒充 HTTP/MQ/对象存储验收。

- [ ] **Step 4: 完成一次统一功能与规范审查。** 对照 R1–R5、全局约束和实际 diff 检查读写覆盖、旁路、事务/副作用顺序、SQL 索引/回填和 API/MQ 兼容；按 Scrapider Guidelines 完成规范审查并修复发现的问题，随后只复查修复点。交接主线按当时的子 Agent 授权决定审查方式；本计划不启动 agent。
- [ ] **Step 5: 交接验证证据与风险。** 汇总修改文件、各 Maven 命令结果、手工 fixture 的具体输入/位置/结果/证据；明确列出未归属记录、未排空旧写入或未获 fixture 等任何未满足的切换条件，不执行 Git 提交。

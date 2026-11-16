---
mode: single
---

# 平台业务空间租户隔离首批切片

## 结果与范围

将批次及上传、流水线任务及输入绑定/运行、对应看板统计改为按当前认证账号的真实租户隔离。保留现有 HTTP 形状、功能权限、个人/状态限制、状态机、重试幂等、消息协议和默认参数。平台 tenantId=0 是独立业务空间；父租户、子租户和平台租户互不继承数据范围。超级管理员现有方法权限放行不扩大数据范围。客户端不得传入或选择租户。

共同要求：[requirements.md](../../inputs/requirements.md)；共同源码事实及已跑基线：[source-evidence.md](../../inputs/source-evidence.md)。路径均相对业务副本根目录。实施时先读取副本 AGENTS.md；遵守其中 Java 业务约束及当前 Scrapider Guidelines 的 Spring Boot、分层、SQL、消息和验证规范。

**执行上下文** 执行开始时记录副本路径、起始工作树状态及源指纹。此文件是静态交接计划；当前没有实施或重新运行回归。

## 目标契约

1. **可信租户来源**：身份只来自认证后的 userId。在现有数据库账号认证链中加载当前 UserPO，确认账号及租户有效后，向后端主体提供当前 tenantId；请求参数、上传字段、JWT 客户端自报内容和 creatorId 均不能决定租户。缺失/失效沿用现有拒绝语义。主体中明确的 0 是平台租户，不能与缺失值混同。用户租户可被管理端调整，旧创建者的当前租户不能证明历史数据归属。
2. **根记录是归属权威**：新增批次根和流水线任务根的 tenant_id，服务端创建时赋值，更新不得转移。文件、上传轮次、分片、阶段、执行、日志、产物和绑定按其真实父根确定归属，不用子表外键代替跨 ID 关系核验。读列表、计数、名称检查、分页在数据库查询中先加租户谓词。
3. **拒绝顺序**：保留现有权限检查；在读敏感字段、签发 URL、写数据库、发消息或触碰对象存储之前，确认认证租户拥有真实父根且传入的批次/文件/上传/任务/阶段/执行 ID 关系一致。外租户 ID 与不存在记录走同一现有未找到/拒绝路径，不返回归属信息。混合租户绑定整体拒绝，不做子集过滤。
4. **名字与对象**：批次名称改为租户内唯一，复用原数据库比较规则并以唯一索引承受并发；更新不能更换租户。同 MD5 只允许租户内命中复用，跨租户不得复用新引用、对象键或暴露命中。历史物理对象可能共享，删除仍使用 BatchFileManage 的全局引用保护。
5. **异步权威**：消息不增加租户字段、不改 Worker 协议。Java 异步处理从已持久化流水线根恢复租户，再核对消息的父任务、阶段、执行 ID、版本及序列；不匹配沿用现有重复/过期消息处理和确认语义，不能先改记录、生成 URL 或触发外部副作用。
6. **存量与启用**：新增结构先可兼容，根 tenant_id 初始可空、无默认值。只用可核实的创建时归属或经核实的可信父关系回填；不得用当前账号租户或 creator_id 推断，不得把未知值写成 0。冲突/无证据记录单独报告并保持空值、不可见。停旧写入方、排空在途任务后才做最终盘点和切换。切换失败时保留隔离列和已写归属；停写或回到最后一个租户感知版本，禁止回滚到可跨租户读取/写入的旧代码。

数据源/公共目录、其它独立域、Worker 协议和 UI 不作独立改造。已识别的资产及标注读回路径列入本切片首批启用门槛（T05），只处理其对本题流水线根/阶段数据的访问。

## 交付与顺序

| 顺序 / 交付 | 输入与开始条件 | 负责文件及结果 | 本地证据 / 下游 |
| --- | --- | --- | --- |
| D1 身份与数据库兼容结构（T01） | R1、R5；现有账号认证事实 | 修改认证主体及构造链；新增批次/流水线根归属列及索引迁移。只扩结构，不启用行为。 | 编译受影响模块；D2、D3 使用可信主体和根字段。 |
| D2 批次读写与文件上传（T02–T03） | D1；现有数据管理、存储与上传流程 | 所有批次查询/写入及文件/分片/ZIP 操作按真实批次父记录授权；名称唯一、MD5 和全局物理引用规则按本计划。 | 现有数据管理检查；与 D3 一起验收 ID 错配无副作用。 |
| D3 流水线、绑定与运行读取（T04） | D1、D2；既有阶段/执行关系及错误语义 | 任务归属、全量输入绑定验证、阶段/执行/日志/产物读取和签发能力均按任务根隔离。 | 现有流水线/执行回归；T05 覆盖请求和异步路径。 |
| D4 异步与统计、跨域读回（T05） | D1–D3；保留现有 after-commit、消息及统计口径 | 异步 Java 消费者从持久化父记录恢复归属；批次/任务统计先按租户聚合；列明的读回旁路不得泄漏本题对象。 | T06 组合验收；无租户消息字段或协议变更。 |
| D5 存量与正式切换（T06） | D1–D4；非生产 fixture 和可停写窗口获准；旧写入/消费者可停止排空 | 按已审证据映射、隔离未知/冲突行、确认索引和版本后开启租户感知版本。 | 迁移报告、隔离查询、切换前后核对和 REVIEW。 |

## 兼容基线与共同约定

输入记录的观察基线：临时副本上 Maven 3.9.16 / Java 17 离线执行既有流水线/执行 3 个测试类、45 个用例通过；数据管理模块无既有 src/test。此为输入提供的已运行结果，不代表本计划实施后的结果。本轮没有新增测试或服务运行。实施时复用既有 PipelineLifecycleServiceImplTest、PipelineConfigurationServiceImplTest、ExecutionEventProcessorTest 等回归；新租户行为用下方验收场景设计并在获准的非生产 fixture 上验证。

| 组件边界 | 权威关系与保证 |
| --- | --- |
| HTTP → Service | 现有 @PreAuthorize 保留；Controller 从认证主体取当前租户并传给业务服务。请求 Param/DTO/VO 与 HTTP 形状不增加可选租户字段。Service 负责业务校验、事务、状态转换和编排。 |
| Service → Manage/Mapper | Service 使用现有 Manage 编排；Manage/Mapper 只承载复用复杂访问、锁、批量或稳定命名语义。列表/分页/聚合用带租户条件的 SQL，不先取全量再内存过滤。 |
| Pipeline root → children | PipelineTaskPO.tenantId 是阶段、执行、日志、绑定的归属根；从 pipelineTaskId 取子记录时同时确认子 ID 属于该任务。 |
| Batch root → children | DataBatchPO.tenantId 是 BatchFilePO、BatchUploadPO 和分片会话的归属根；含多个 ID 的请求逐一核对实际父子关系。 |
| Java MQ → execution | 既有事件 ID、父子 ID、运行/执行版本和序列仍按原协议传递。消费者从持久化根读取租户，消息中的关联关系与根/子记录一致后才执行现有转换。 |
| 存储 → 临时访问能力 | 生成、读取、覆盖、删除对象前完成根及 ID 关系授权；仅在验证后使用现有存储 SDK/URL 机制。历史共享对象物理删除以全局引用数为准。 |

## 实施步骤

### T01 认证主体与兼容归属结构

- **输入**：R1、R5；source-evidence.md 中 UserPO、JwtAuthenticationProvider、DatabaseUserPrincipal、AuthServiceImpl、UserServiceImpl 事实。
- **文件**：
  - 修改 backend/business/business-auth/src/main/java/com/orvx/business/auth/security/DatabaseUserPrincipal.java。
  - 修改 backend/business/business-auth/src/main/java/com/orvx/business/auth/security/jwt/JwtAuthenticationProvider.java 与 backend/business/business-auth/src/main/java/com/orvx/business/auth/security/DatabaseUserDetailsService.java 的主体构建链。
  - 新建 scripts/java-sqls/schema/005-tenant-isolation.sql（如副本已有该序号，按同目录现行顺序调整文件名并同步本计划）。
- **实现**：认证时依据已认证 userId 读取当前账号及有效租户，主体携带服务端解析的租户；覆盖 JWT 请求与用户名密码认证两条主体构造路径。对 tenantId=0 按现有平台定义显式处理；失效账号/租户沿用现有拒绝路径。SQL 仅给批次根和流水线任务根添加可空、无默认的归属列及查询索引；先加 (tenant_id, name) 复合唯一索引并保留旧全局名称索引；正式切换前再移除旧全局索引，保持现有列比较/排序规则。不要给子表加重复租户列，不改业务默认值。
- **输出与验证**：认证主体不接受客户端租户；两种主体构造返回数据库当前 tenantId。离线编译现有 auth 与 foundation 模块；SQL 在测试库核对新增列、索引及旧写入兼容性。该步骤不得使旧代码能借新列越权，正式切换留至 T06。
- **进度/证据**：待实施。

### T02 批次根查询、更新与批次文件

- **输入**：D1、目标行为 1–4；锚点 DataBatchController、DataBatchServiceImpl、DataBatchMapper、BatchFileMapper、BatchFileManage。
- **文件**：
  - 修改 backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/controller/DataBatchController.java、backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/DataBatchService.java、backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/impl/DataBatchServiceImpl.java。
  - 修改对应 backend/foundation/foundation-entity/src/main/java/com/orvx/foundation/entity/domain/po/DataBatchPO.java、backend/foundation/foundation-entity/src/main/java/com/orvx/foundation/entity/domain/po/BatchFilePO.java（仅按需映射根字段）；backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/DataBatchMapper.java、backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/BatchFileMapper.java、backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/DataBatchManage.java、backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/BatchFileManage.java。
- **实现**：Controller 从认证主体取租户并传服务，不改客户端 Param。创建时服务端赋根归属；更新只改允许字段，不改 tenantId。批次列表、详情、计数、按名称检查在 SQL 中按 tenantId 过滤再分页/聚合；名称先查沿用现有错误，数据库唯一索引处理并发。外租户和不存在同现有 batch not found 路径。文件列表、预览/下载 URL、校验、删除先确认授权根及 fileId→batchId 关系；状态、顺序与现有 MinIO/数据库一致性逻辑保持。
- **输出与验证**：同权限下 A/B 不互见；同租户同名冲突，跨租户同名可独立创建；更新不能转移归属。检查自定义 SQL 和所有 DataBatchServiceImpl 对外方法均覆盖，不做内存后过滤。
- **进度/证据**：待实施。

### T03 整文件、分片与 ZIP 上传侧效应

- **输入**：D2；R3；FileUploadController、FileUploadServiceImpl、ChunkUploadServiceImpl、ArchiveUploadServiceImpl、ArchiveUploadTaskExecutor、BatchFileManage。
- **文件**：修改 backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/controller/FileUploadController.java、backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/impl/FileUploadServiceImpl.java、backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/impl/ChunkUploadServiceImpl.java、backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/impl/ArchiveUploadServiceImpl.java、backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/service/support/ArchiveUploadTaskExecutor.java；涉及查询时修改 backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/BatchFileManage.java 及对应 Mapper。
- **实现**：
  1. callback、初始化、重试、分片 part/status/merge/cancel 均接入可信租户。对 fileId/uploadId/batchId 查回持久父记录，验证同一会话和同一批次；授权失败发生在 URL 签发、数据库写入或对象存储调用之前。
  2. ZIP 创建任务前核验批次；结果查询用任务中真实 batchId 回查租户内父批次再返回。异步执行器在对象存储操作前重新确认任务父批次仍存在且关系匹配；维持已有内存任务时效和错误语义。
  3. MD5 命中查询联接批次根并限定 tenantId。仅当前租户的对象可触发秒传/断点复用；跨租户命中当作新上传，不返回命中/引用、不新建共享引用。历史对象删除仍按全局引用计数保护。
- **输出与验证**：A 的 fileId 配 B 的 uploadId、或 A 的任务/批次配 B 的文件 ID 时走既有拒绝路径；证据包含数据库行未变、没有 MQ、没有对象存储调用、没有预签名 URL。检查合法重复分片、正常 ZIP 与既有状态/重试。
- **进度/证据**：待实施。

### T04 流水线根、绑定与所有可见阶段

- **输入**：D1–D3；R4；控制器锚点 PipelineLifecycleController、PipelineConfigurationController、PipelineStageExecutionController、PipelineTaskLogController，以及 PipelineTaskDataBatchManage/Mapper。
- **文件**：
  - 修改 backend/foundation/foundation-entity/src/main/java/com/orvx/foundation/entity/domain/po/PipelineTaskPO.java、backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/PipelineTaskMapper.java、backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/PipelineTaskManage.java、backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/mapper/PipelineTaskDataBatchMapper.java、backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/manage/PipelineTaskDataBatchManage.java。
  - 修改 backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/controller/PipelineLifecycleController.java、backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/controller/PipelineConfigurationController.java、backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/controller/PipelineStageExecutionController.java、backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/controller/PipelineTaskLogController.java；同包 Service 接口和 service/impl 中被这些 Controller 调用的实现，包括 PipelineLifecycleServiceImpl.java、PipelineConfigurationServiceImpl.java、PipelineStageExecutionQueryServiceImpl.java、PipelineTaskLogServiceImpl.java。
- **实现**：创建任务时从认证主体赋 tenantId；所有任务读写、配置、删除、确认、运行/重试、阶段/执行/日志/产物查询先以 tenantId 找根任务，子 ID 必须属于该根。URL 仅对已核实记录签发。更新不可改根归属。绑定请求先按 tenantId、datasetType 和现有限制核验全部 batchIds，再在现有事务/比较门禁内整体替换；任一 ID 越权或不存在都拒绝整个请求，拒绝前无绑定写入且不发布运行消息。保留每个现有状态分支、错误码、状态机。
- **输出与验证**：列出所有上述控制器中访问 task/stage/execution/log/产物的路径；不得只给列表/详情加过滤而遗漏下载、重试、异步入口。检查服务仍通过 Manage 访问数据库，不在 Controller/Listener 直调 Mapper。
- **进度/证据**：待实施。

### T05 异步执行、统计和读回路径

- **输入**：D4 前置输出；既有 afterCommit 发布、ExecutionEventProcessor 父锁及版本/序列检查、看板直调 Manage 的事实。
- **文件**：
  - 修改 backend/business/business-governance-execution/src/main/java/com/orvx/business/governance/execution/processor/ExecutionEventProcessor.java 及触达任务/绑定的执行 Service；必要的持久化查询仍归 foundation-db Mapper/Manage。
  - 修改 backend/business/business-dashboard/src/main/java/com/orvx/business/dashboard/service/impl/DashboardServiceImpl.java 及其已有统计访问方法。
  - 首批启用前检查并处理对本题根记录的直接读取：backend/business/business-data-asset/src/main/java/com/orvx/business/data/asset/service/impl/DatasetAssetServiceImpl.java、backend/business/business-governance-annotation/src/main/java/com/orvx/business/governance/annotation/service/impl/AnnotationProjectServiceImpl.java（尤其 pageAnnotationTasks 的任务名/阶段列表读取）及 backend/business/business-governance-annotation/src/main/java/com/orvx/business/governance/annotation/service/impl/AnnotationSpotCheckServiceImpl.java。只修改其访问本题 pipeline root/stage/execution 的谓词或 ID 核验，不改其独立业务数据模型。
- **实现**：异步消费者按消息 pipelineTaskId 加锁读持久根，取其 tenantId，再验证 stageTaskId、executionTaskId、运行/执行版本与序列关系；无根、未归属、父子错配不得更新其它租户数据、生成访问能力或发起外部副作用，并沿用既有过期/重试/幂等语义。运行消息只在绑定全部通过且事务提交后沿用既有发布机制。批次/任务相关看板查询在数据库聚合前加 tenant 谓词。资产/标注读回只要对外返回本题任务/阶段信息，就必须由当前租户过滤；若某调用经证据确认仅为内部执行且不暴露请求读取，记录该调用和不影响启用的理由。
- **输出与验证**：既有消息字段不变；同一事件重复投递保持原幂等结果；父子错配不会影响对方根。A/B 看板统计分别只含各自批次与任务。上述读回路径要么已带根范围，要么有明确的启用阻断记录。
- **进度/证据**：待实施。

### T06 存量盘点、切换和失败隔离

- **输入**：D1–D5；允许停写/排空；只使用可追溯证据，不把现账号租户当历史记录。
- **文件**：修改 scripts/java-sqls/schema/005-tenant-isolation.sql。盘点映射与冲突报告作为切换执行证据保存；不得在没有来源证据时把未知归属写入脚本。
- **实现顺序**：
  1. 先增 nullable 无默认列。新旧运行时共存阶段不宣称已隔离；新增旧写 NULL 只允许在隔离启用前的维护窗口发生。
  2. 暂停批次/流水线/上传写入，停止旧 Java 写入和消费者，排空队列及 ZIP/异步在途任务；盘点后只对具备审计或其他创建时证据的根回填。流水线绑定可作父关系证据的前提是相关批次已证实归属、关系集合一致且无独立证据冲突。当前租户与 creatorId 只作为核对线索，不能单独回填。
  3. 输出按“可证归属、缺证、混合租户关系、父子冲突、重复名称待决”分类的行数与 ID 报告。未证记录保持 tenant_id IS NULL，从正常列表/详情/异步处理全部隔离；禁止默认平台 0。确认在已知租户内名称唯一后启用复合唯一索引，旧全局唯一索引按迁移步骤移除。
  4. 仅在所有旧写入方停止、待处理任务已排空或按既有语义安全处置、未知记录隔离查询通过、根/子关系核对通过后启动 tenant-aware 版本。验收按获准非生产 fixture 完成。
  5. 切换失败保留新列、索引和归属；关闭业务写入口并修复后重试，或回到最后一个已含租户范围的版本。已出现租户内同名数据后不得恢复无租户全局读写的旧版本，不清除归属列、不把隔离数据改归平台。
- **输出与验证**：迁移前后总行数相等；已归属数 + 隔离数 = 根表总数；隔离记录无法通过新服务/异步消费者读取或操作；无旧写入方在切换后生成 NULL 归属。
- **进度/证据**：待实施。

## 验收与代表性复演

使用同权限的租户 A/B、A 的有权限伙伴、平台 0、父/子租户各自的非生产账号与数据。记录 HTTP 请求/响应、数据库前后快照、消息观测和对象存储/预签名调用证据。真实租户 HTTP、消息和对象存储项目需未来获准 fixture；缺 fixture 只阻止对应真实联调证据，不改变代码级离线回归结论。不得为本计划新增单元测试。

- [ ] **权限与租户双门（R1）**：A、A 伙伴和 B 用相同功能权限请求批次/任务列表、详情和名称检查；A 与其伙伴在 A 范围内行为一致，B 看不到 A 的名称/计数/详情。tenantId=0 只看平台根；父租户、子租户互不可见。无租户身份按既有拒绝方式处理。记录各调用返回及数据库条件。
- [ ] **批次、子文件与上传错配（R2–R3）**：A 取 B 的 batchId/fileId/uploadId 组合调用列表、预览/下载、回调、分片 part/status/merge/cancel、ZIP 结果及删除。每个拒绝都与不存在路径不可区分，数据库、消息、MinIO、签名 URL 均无副作用；合法 A 操作保持旧状态机。记录状态快照和副作用观测。
- [ ] **名称及 MD5（R2–R3）**：A/B 各创建同名批次成功，A 在本租户重复名失败；同 MD5 跨租户初始化不返回秒传/命中，也不复用新对象引用。删除历史共享对象的一个引用后，另一引用仍可读，证明全局引用保护仍有效。
- [ ] **绑定、运行与消息（R4）**：A 创建任务并尝试绑定 [A_batch, B_batch]，整个请求失败，原绑定不变，消息数为零；只绑定 A 批次后运行成功。向消费入口投递 A 的 taskId 配 B 的 stage/execution ID 或错版本事件，不改变 B 行、不签 URL；合法事件重复投递符合既有幂等结果。证据为绑定/执行表、事务后消息及消费记录。
- [ ] **统计和跨域读取（R4）**：A/B 仪表盘分别只汇总各自任务与批次；以 A 权限访问资产/标注中的流水线回读时，不能返回 B 的 task/stage/execution 信息。记录查询条件和返回 ID。
- [ ] **迁移与启用门槛（R5）**：注入一条无归属根及一条关系冲突的存量记录，盘点结果分别列明且保持 NULL；新租户 API/消息不能读到它们。模拟旧写入方仍运行，切换条件必须判失败且维持停写/隔离；只有旧写入停止、排空完成、核对报告通过才允许启用。
- **缺口**：当前没有获准的真实租户 HTTP/MQ/对象存储 fixture；由切换负责人于非生产环境补齐对应证据，不可用静态推演替代。
- **评审**：代码集成后按 [REVIEW.md](REVIEW.md) 执行一次功能与规范审查；在本节记录发现、处置和复查证据。

## 代表性场景与静态走查

- **C01 A 读取或上传 B 文件**：A 的认证主体提供 tenant A；T03 用 B 的 batchId/父记录核验失败，沿用未找到路径；在调用 MinIO、写入、发消息、生成 URL 前返回。覆盖 T01–T03 与第一、二项验收。
- **C02 A 任务绑定混合批次**：T04 在任何关系替换前一次核验所有 batchId，发现 B 批次后整体拒绝；事务内无部分删除/插入，after-commit 发布器无事件。覆盖 T04 与第四项验收。
- **C03 异步事件重放**：T05 先从持久化 pipeline 根读 tenant A，再对照事件中 task/stage/execution/version/sequence；合法重复走原幂等分支，错配不执行对 B 记录的更新。覆盖 T05 与第四项验收。
- **C04 未知存量及失败切换**：T06 对无证根不回填，NULL 根由所有租户查询显式排除；旧 writer 未停时不启用；失败时保留 tenant 列并关写，不恢复旧的全局读写。覆盖第五、六项验收。

| 场景 | 决定性锚点与状态 | 静态结论 |
| --- | --- | --- |
| C01 | DataBatchServiceImpl、FileUploadController、ChunkUploadServiceImpl、ArchiveUploadServiceImpl；批次/文件/轮次有父 ID，MD5 当前全局匹配 | 必须在服务端存储副作用前核验父归属及 ID 链；跨租户 MD5 走新上传路径，历史删除仍全局计引用。 |
| C02 | PipelineTaskDataBatchMapper 现按 datasetType 和 batchIds 查询；输入证据要求混合整体拒绝 | 预检完整 tenant 内集合，再复用既有事务/替换门禁；不能过滤 B 后继续。 |
| C03 | ExecutionEventProcessor 当前已有父锁、父子关系、版本/序列检查；命令/回执已含关联 ID | 新归属从持久根恢复，不改 Worker 协议；将 tenant 判定并入该既有父记录路径。 |
| C04 | 根 PO 无租户列，creator 可重新分配，子表关联不能证明所有跨表一致性 | 只回填确有证据的根；未知/冲突 NULL 隔离，维护与停写条件先于开启。 |
| D1–D5 | DashboardServiceImpl 直接调用统计 Manage；资产与标注存在读取 pipeline task/stage 的调用 | 统计过滤须发生在聚合前；读回路径须纳入或作为明确阻断条件，不能声称仅主 Controller 已隔离就可启用。 |

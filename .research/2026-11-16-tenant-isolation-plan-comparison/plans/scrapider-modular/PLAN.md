---
mode: modular
---

# 批次与流水线按租户隔离

## 结果与范围

以共同需求 [requirements.md](../../inputs/requirements.md) 和共同源码事实 [source-evidence.md](../../inputs/source-evidence.md) 为唯一输入基线。本计划交付首批平台隔离切片：数据批次及其上传/文件、流水线任务及输入绑定/运行记录，以及相应仪表盘统计。HTTP 形状、消息协议、已有权限、个人可见性、状态机、重试/幂等和运行默认值保持不变。

**执行环境** 执行开始时填写集成 checkout、起始工作树状态及源码指纹；共同源码事实记录的当前基线为无提交副本。计划文件路径均相对业务仓库根目录。

本计划的路径别名：

- `E`：`backend/foundation/foundation-entity/src/main/java/com/orvx/foundation/entity/`
- `F`：`backend/foundation/foundation-db/src/main/java/com/orvx/foundation/db/`
- `C`：`backend/business/business-common/src/main/java/com/orvx/business/common/`
- `Auth`：`backend/business/business-auth/src/main/java/com/orvx/business/auth/`
- `D`：`backend/business/business-data-manager/src/main/java/com/orvx/business/data/manager/`
- `P`：`backend/business/business-governance-pipeline/src/main/java/com/orvx/business/governance/pipeline/`
- `X`：`backend/business/business-governance-execution/src/main/java/com/orvx/business/governance/execution/`
- `Dash`：`backend/business/business-dashboard/src/main/java/com/orvx/business/dashboard/`
- `Asset`：`backend/business/business-data-asset/src/main/java/com/orvx/business/data/asset/`
- `An`：`backend/business/business-governance-annotation/src/main/java/com/orvx/business/governance/annotation/`
- `Q`：`backend/business/business-governance-quality/src/main/java/com/orvx/business/governance/quality/`

## 目标行为与连接

所有 HTTP 业务入口先保留既有权限判断，再由可信 Principal 的 `userId` 调用 `CurrentTenantService` 读取当前账号租户；请求参数、路径、header、token 自定义字段都不得提供租户。`tenantId=0` 是有效且独立的平台业务空间，正数租户须存在、未软删除且未停用；空值、负值、无效账号按现有认证/租户拒绝路径失败。权限系统中的超级管理员放行不改变业务数据范围；父租户、子租户与平台空间之间不继承业务数据。

归属字段只落在批次和流水线两个业务根记录。上传轮次、文件、分片会话、阶段任务、执行任务、日志与质量门禁结果依可信父记录和现有关联键核验；读取、统计和分页均先在数据库按租户过滤。写入必须在任何数据库、消息、临时访问链接或对象存储副作用之前完成归属校验。下表是共用契约的唯一权威摘要：

| 边界 | 生产者 → 消费者及保证 | 详细契约 |
| --- | --- | --- |
| 身份 → 业务服务 | HTTP Principal 的用户 ID → `CurrentTenantService` → 当前 `tenant_id`；每次按数据库账号记录解析，0 保持为独立平台空间 | 本节及 [B00](briefs/tenant-foundation-migration.md) |
| 批次 → 文件/上传/同步 | 批次租户 → 按批次、上传轮次与会话 ID 关系授权；拒绝先于 DB/MinIO/URL/异步副作用 | [B01](briefs/data-batch-upload.md) |
| 批次 → 流水线绑定 | 批次根和任务根租户相同才可整体绑定；混入外租户批次时无绑定写入、无状态推进、无消息 | [B02](briefs/pipeline-async.md) |
| 持久化任务 → 异步执行 | 已持久化 pipeline task 为租户权威；沿现有 MQ 父 ID、版本和关联关系恢复并验证，不扩展 Worker 协议 | [B02](briefs/pipeline-async.md) |
| 任务 → 旁路读取/统计 | 仪表盘、数据资产联动、标注和质量端点按同一任务租户守卫，不另建全域隔离 | [B03](briefs/task-readback-dashboard.md) |

### 共享语义

- `DataBatchPO.tenantId` 与 `PipelineTaskPO.tenantId` 是持久化归属事实；`creator_id`、`created_by` 仍用于审计/现有个人规则，不能用来证明历史创建租户。
- 新批次及任务由服务端写入解析得到的 `tenantId`；更新只能按 `id + tenantId` 定位，禁止租户转移。名称唯一约束为非空归属的 `(tenant_id, batch_name)`，不再全局唯一。
- 子记录不接受客户端 tenant。文件操作必须核对 `fileId → uploadId → batchId` 的实际关系；分片会话、归档结果及同步任务也必须沿其持久化父记录确认归属。外租户对象 ID 与不存在复用当前相同错误路径。
- 共享 MD5 的物理对象可继续共享；不得跨租户复用新文件引用、返回命中或签发 URL。删除物理对象前保留全局引用数保护。
- 异步事件从受信消息通道读取现有 `pipelineTaskId / stageTaskId / executionTaskId`、版本与序列信息，并从持久化根记录恢复租户；所有父子 ID 与现有 run/execution version 都须匹配。重复投递继续幂等。
- 在 `tenant_id IS NULL` 的存量根记录保留为不可见隔离行；不得填 0。若原子关联跨租户或无法证明创建时归属，需输出隔离清单，直到有可信证据再人工映射。

## 决策与启用条件

| 决策 | 状态与方案 | 影响与工作项 | 发布证据 |
| --- | --- | --- | --- |
| D01 根记录归属 | 已接受：仅批次、流水线任务新增 `tenant_id`；所有子记录按实际父关系守卫，不以外键存在代替租户一致性 | B00–B03 | 关联冲突预检为 0；混合绑定验收拒绝且无副作用 |
| D02 身份来源 | 已接受：`CurrentTenantService` 只接收 Principal 提取的 userId，使用 `UserManage`/`TenantManage` 复核账号与租户状态；0 明确接受，负值/空值拒绝 | B00–B03 | 正常/停用/软删除/缺失/平台账号对照记录 |
| D03 存量归属 | 已接受：只有创建时证据或可信父关系可赋租户；当前账号租户不能证明历史归属；不确定行留空并列隔离清单，绝不默认平台 | B00、最终切换 | 回填输入及来源可审计，未解释行、父子冲突行清单明确 |
| D04 滚动切换 | 已接受：先准备兼容结构；在维护窗暂停写入并排空旧 Java/异步写入方，完成核对后再切到新应用。无新租户默认值或临时兼容写入 | B00、最终切换 | 旧版本/旧任务数为 0；隔离行不可读写；失败时维持停写且旧全局索引仍可恢复 |
| D05 外部形状 | 已接受：HTTP、错误路径、状态枚举、MQ/Worker 消息体、运行参数和对象保留策略不变 | B01–B03 | 既有回归通过；新租户行为以非生产 fixture 证据验收 |

## 交付与交接

| 交付及 Brief | 开始条件 | 可用结果与验收 | 进度与证据 |
| --- | --- | --- | --- |
| D1 可信身份与兼容结构：[B00](briefs/tenant-foundation-migration.md) | 本计划、根 AGENTS.md、现有 `UserPO`/租户状态与 PostgreSQL schema | 共用服务能解析已认证用户；两根 PO/初始化 schema 与升级前置脚本可兼容旧应用；没有数据启用 | 待执行 |
| D2 批次、上传与同步：[B01](briefs/data-batch-upload.md) | D1 的服务契约与 nullable 根列 | 批次/文件/轮次/分片/归档/同步所有读写与计数受租户过滤；同名异租户可用；拒绝无副作用 | 待执行 |
| D3 流水线与异步：[B02](briefs/pipeline-async.md) | D1；D2 已提供按 tenant 核验批次的服务接口 | 任务 CRUD、绑定、运行、重试、阶段/执行详情与事件消费按根记录归属；现有协议/重试保持 | 待执行 |
| D4 旁路与仪表盘：[B03](briefs/task-readback-dashboard.md) | D3 的任务归属契约 | 统计和直接使用 pipelineTaskId 的数据资产、标注、质量调用均不能绕过根租户；作为首批启用的最终代码交付 | 待执行 |
| D5 存量切换与验收 | D1–D4 全部集成；未来获准的非生产 fixture；写入维护窗 | 预检、回填/隔离、索引切换、旧写入排空、tenant 对照验收均完成；失败保持停写和隔离 | 待执行；不得越过 D04 门槛 |

D2 与 D3 顺序执行：D3 的绑定检查使用 D2 已交付的按 tenant 校验能力。D4 必须在 D3 之后；其代码与 D1–D3 同一启用窗口发布，避免部分旁路仍能读取任务。D5 的数据库与运行验收由集成负责人持有，不能由单个 Brief 自证。

## 集成与审查

- [ ] **现有回归**（集成负责人）：在合并后的 `backend/` 使用共同输入记录的 Maven 离线命令，运行 `PipelineLifecycleServiceImplTest`、`PipelineConfigurationServiceImplTest`、`ExecutionEventProcessorTest`（45 例既有基线已通过；不新增单元测试），记录命令和结果。此项证明既有生命周期/配置/事件路径没有回归，不作为新租户行为证据。
- [ ] **端到端租户验收**（集成负责人，需未来获准的非生产 fixture）：按 [C01–C06](#代表场景) 执行；记录 fixture 租户/用户/根 ID、请求入口或事件、拒绝路径、DB 前后计数、MQ 投递/副作用、对象存储调用及返回码。未获环境只延后此证据，不得以静态推理代替。
- [ ] **迁移验收**（D5）：在克隆数据上先跑只读预检；未映射记录与父子冲突按 0 之外的实际列表保存；验证脚本不改写它们、不将其设为 0。停写、排空后切换；失败时不得恢复多租户业务流量。
- [ ] **Gaps**：业务数据管理没有既有 `src/test`；新增隔离行为只设计非生产人工验收，计划执行不创建单元测试。无真实 fixture 时，写明 HTTP/MQ/对象存储证据缺口。
- **Review** 集成后由主 Agent 按 [REVIEW.md](REVIEW.md) 调度功能与规范审查；本计划只记录审查处置，不由审查代替验收。

## 代表场景

### C01 同租户与跨租户读取

- **输入与触发**：用户 `u10` 与有对应功能权限的伙伴 `u11` 同属 tenant 10；`u20` 属 tenant 20；批次 `b10/b20`、任务 `t10/t20` 分别归属 10/20。用现有 `DataBatchController`、Pipeline 四类 Controller 和 Dashboard 入口执行列表、详情、计数。
- **路径与结果**：u10 查询只计入 tenant 10，外租户 ID 与不存在走同一现有错误路径；对原业务规则允许同租户伙伴读取的共享行，u11 可读 tenant 10 数据；原个人限制行仍拒绝 u11；Dashboard 的批次和任务统计/列表均无 tenant 20 数据。
- **参考**：B01、B02、B03；D1–D4。

### C02 租户 0 与父子租户

- **输入与触发**：tenant 0、父 tenant 10、子 tenant 11、无关 tenant 20 各有同权限用户和同名批次；逐一使用批次列表/详情、流水线详情与 Dashboard。
- **路径与结果**：仅 tenant 0 的行对 tenant 0 可见，10 与 11 各自隔离，20 不受父子关系影响；无客户端参数能扩大范围；平台管理 API 的现有权限结果保持。
- **参考**：B00–B03；D1 的身份、D2 的根过滤、D3 的任务过滤、D4 的统计。

### C03 批次名称与拒绝无副作用

- **输入与触发**：在 tenant 10 创建名为“隔离演练”的批次，再由 tenant 20 创建同名批次；tenant 10 再提交一次同名创建。随后 tenant 10 用 tenant 20 的 `batchId/uploadId/fileId` 调初始化、part/status/merge/cancel、ZIP 结果、校验、预览/下载/删除入口。
- **路径与结果**：前两次按租户成功，tenant 10 重名按现有唯一冲突错误失败；错配请求在 MinIO、URL、DB 行/状态或消息前失败，记录前后快照证明无副作用。
- **参考**：B01；D2 的名称与父子关系。

### C04 MD5 与物理引用

- **输入与触发**：tenant 10 与 20 分别上传内容字节 `tenant-sample-v1`（同一 MD5）；随后删除 tenant 10 的文件。
- **路径与结果**：tenant 20 请求不得命中/获知 tenant 10 引用或对象键，并建立本租户引用；tenant 10 删除后若任何租户仍引用同一物理对象，不删除对象。验证返回体、DB 引用和对象存储调用。
- **参考**：B01；D2 的 MD5 与全局引用保护。

### C05 混合绑定与事件关联

- **输入与触发**：tenant 10 任务 `t10` 请求绑定 `[b10, b20]`；再以现有消息格式为 `t10` 产生一次合法事件、同一事件重复投递，以及一个将 `executionTaskId` 指向其他 `stageTaskId` 的错配事件。
- **路径与结果**：混合批次整体拒绝且绑定表、任务状态、MQ 发送数不变；合法事件完成既有转换；重复投递幂等；错配事件不改任何状态/执行记录。用 DB 和发布/消费记录核对。
- **参考**：B02；D3 的批次契约、持久化根与异步事件。

### C06 存量隔离与旧写入门槛

- **输入与触发**：在克隆数据中准备可证实归属行、无创建时归属证据行、父子租户冲突行，并让一个旧版写入方仍运行一次；试跑预检和切换。
- **路径与结果**：只有证据映射进入 tenant；未知/冲突行留空并列报告，切新读路径不可见；旧写入活动使 D5 启用条件失败并维持停写。排空后再切换，失败时保留全局索引和原 schema 兼容性。
- **参考**：B00 与 D5；D03–D04。

## 静态复演

| 场景 | 决定性事实与中间状态 | 结论 |
| --- | --- | --- |
| C01 | 认证每请求由 `JwtAuthenticationProvider` 按 userId 重载账号；批次当前未按租户过滤，pipeline 根无 tenant 列；D1 提供可信租户，D2/D3 在分页/查询条件前过滤 | 计划闭合；具体接口行为留给未来非生产验收 |
| C02 | `RbacConstants` 将 0 定义为平台，租户树可两级；权限 handler 可放行方法但不能代替业务行过滤 | 计划显式将 0 作为独立值，禁止层级继承 |
| C03–C04 | 文件有 batchId/uploadId，分片按会话 ID 处理；MD5 目前全局复用 objectKey，删除已有全局引用保护 | B01 必须先核父链，再副作用；保留物理引用全局保护 |
| C05 | 当前事件处理已有父锁、execution 父关系、版本/序列检查；消息包含现有父 ID，不含租户 | B02 沿用且补足根租户一致性；不改 Worker 协议 |
| C06 | `creator_id`/`created_by` 不能证明创建时 tenant；用户租户可被改动，现 schema 无根租户列 | 只按证据回填；未证实行不归平台，启用由旧写入排空门控 |

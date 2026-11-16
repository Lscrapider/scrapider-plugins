# B01 批次、上传、文件与同步隔离

## 范围与输入

- **交付**：[D2 批次、上传与同步](../PLAN.md#交付与交接)。
- **输入**：[R1–R3、R5](../../../inputs/requirements.md)、[批次与上传源码事实](../../../inputs/source-evidence.md)、[B00 的 CurrentTenantService 与根列](tenant-foundation-migration.md)、[总计划共享语义](../PLAN.md#目标行为与连接)。
- **依赖**：D1 的 nullable `DataBatchPO.tenantId` 与共享租户解析已集成。新行为仍需 D5 非生产 fixture 验收。

## 契约与保留行为

凡 HTTP 批次/文件操作都以 Principal userId 解析的 tenant 执行；在现有功能权限、个人限制和状态限制外叠加租户谓词。分页、名称检查、计数和 Dashboard 所用的批次统计须先按 tenant 限定。新批次/上传轮次使用当前批次归属；更新不能转移租户。上传轮次、文件、分片会话、归档任务、同步任务没有独立租户权威，必须从数据库实际父记录反查和核对。

获取 URL、创建/修改行、状态变更、投递异步工作、MinIO 读写前先核对 `fileId → uploadId → batchId` 关系与父批次租户。跨租户 MD5 不返回命中、不泄露 objectKey、不复用新引用；物理对象仍按全局引用保护决定是否删除。现有 HTTP 响应、上传状态机、同步幂等和对象存储策略不变。

## 步骤

- **B01.1 收口批次读写和统计**
  - **文件** `Modify D/controller/DataBatchController.java`、`D/service/impl/DataBatchServiceImpl.java`；`Modify F/mapper/DataBatchMapper.java`、`F/manage/DataBatchManage.java`。
  - **实现**：Controller 把 Principal userId 传给服务；列表/详情/计数/名称唯一检查/导出/更新/删除/轮次读取统一由租户根条件过滤，过滤发生在 Page 与聚合前。创建从 CurrentTenantService 绑定 tenantId；更新只用 `id + tenantId`，并保留当前 creator/个人及状态判断。外租户与不存在保持同一错误路径。自定义 mapper SQL、Manage 自定义方法不得留无 tenant 的公共旁路。
  - **验证**：现有 API 输入下，tenant 10/20 的同名批次分别允许、同租户重名冲突；列表总数/页内容/统计均无跨租户行；不存在与外租户 ID 的错误形状相同。

- **B01.2 守卫文件、分片和归档异步路径**
  - **文件** `Modify D/controller/FileUploadController.java`、`D/service/impl/ChunkUploadServiceImpl.java`、`FileUploadServiceImpl.java`、`ArchiveUploadServiceImpl.java`、`D/service/support/ArchiveUploadTaskExecutor.java`；`Modify F/mapper/BatchFileMapper.java`、`F/manage/BatchUploadManage.java`、`BatchFileManage.java`、`FileChunkUploadManage.java`、`FileChunkPartManage.java`。
  - **实现**：初始化/part/status/merge/cancel、ZIP 结果、验证、预览/下载/删除与文件回调都先以父记录链确认租户及 ID 一致，再访问 MinIO、签 URL、写行或改状态；异步归档结果按持久化批次/任务关系检查而非只按 taskId 取。所有按 fileId/uploadId 的查询都必须回到实际 batch。保留 `BatchFileManage` 的全局对象引用检查。
  - **验证**：用 tenant 10 的 session 与 tenant 20 的 file/upload ID 交叉调用；拒绝时记录数据库前后行/状态、MQ/异步提交次数、MinIO 调用、URL 数为零；跨租户相同 MD5 无共享引用或命中响应。

- **B01.3 收口同步旁路与分配轮次**
  - **文件** `Modify D/controller/DataSyncController.java`、`D/service/impl/DataSyncServiceImpl.java`、`SyncExecutor.java`、`D/service/support/UploadBatchAllocator.java`、`BatchStatusResolver.java`；批次/上传访问归属 B01.1–B01.2 的 `F/manage/DataBatchManage.java`、`BatchUploadManage.java`。
  - **实现**：同步请求中的 batchId 先校验当前 tenant；服务端新建批次沿 B01.1 写归属。Executor 从持久化 upload/batch 恢复根关系，核对后才同步文件、更新状态或重算投影；批次活跃绑定限制、轮次编号、确定性 object key 与幂等行为保持。
  - **验证**：异租户同步 ID 在 source 下载或对象存储之前失败；合法重复触发只产生既有幂等结果；旧版本 SyncExecutor 仍活动时 D5 不允许切流。

## 交付与下游

- **产出**：D2 所有批次与子记录 HTTP/后台入口被租户根守卫；pipeline 绑定者可用受 tenant 校验的批次读取。HTTP contract 不变。
- **回传**：提交每步路径、过滤/授权位置、错误路径、拒绝无副作用证据和跨租户 MD5/引用证据；写明仍未枚举的批次写入方。D5 未获对象存储 fixture 时保持该项未验收，不以本地编译代替。

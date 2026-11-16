# B02 流水线根记录、绑定与异步执行

## 范围与输入

- **交付**：[D3 流水线与异步](../PLAN.md#交付与交接)。
- **输入**：[R1、R4、R5](../../../inputs/requirements.md)、[流水线/消息源码事实](../../../inputs/source-evidence.md)、[B00 身份与持久化合同](tenant-foundation-migration.md)、[B01 按 tenant 校验批次的服务](data-batch-upload.md)、[总计划共享语义](../PLAN.md#目标行为与连接)。
- **依赖**：D1 已集成；D2 的批次服务可在目标 tenant 下判断批次归属。新行为不创建单元测试，只复用既有回归并交给 D5 非生产验收。

## 契约与保留行为

HTTP 创建任务时由可信 userId 解析并写 `PipelineTaskPO.tenantId`；列表、详情、配置、绑定、启动/重试/停止、日志、阶段记录、执行记录、质量门禁与临时访问链接按 `pipelineTaskId + tenantId` 限定，同时保留已有个人、状态、版本与权限判断。绑定前验证所有批次 ID、租户和输入类型；任一无效/外租户 ID 整体拒绝，不写绑定、不改任务状态、不 after-commit 发消息。

异步入口不从 Worker/MQ payload 读租户。按现有可信通道和 `pipelineTaskId` 读取持久化根，再核对 `stageTaskId`、`executionTaskId`、run/execution version/sequence 的父子关系。未知根、父子冲突或过期版本沿现有拒绝/幂等路径处理且不能修改另一个任务。保留现有消息字段、routing、重试与重复投递行为。

## 步骤

- **B02.1 写入和读取只命中本租户任务**
  - **文件** `Modify P/controller/PipelineLifecycleController.java`、`PipelineConfigurationController.java`、`PipelineStageExecutionController.java`、`PipelineTaskLogController.java`、`PipelineFunctionController.java`、`P/service/impl/PipelineLifecycleServiceImpl.java`、`PipelineConfigurationServiceImpl.java`、`PipelineFunctionServiceImpl.java`、`PipelineStageExecutionQueryServiceImpl.java`、`PipelineParseExecutionQueryServiceImpl.java`、`PipelineTaskLogServiceImpl.java`；`Modify F/manage/PipelineTaskManage.java`、`PipelineStageTaskManage.java`、`ExecutionTaskManage.java`、`PipelineTaskLogManage.java`、`PipelineStageQualityGateResultManage.java`、`PipelineStageQualityGateResultExecutionTaskManage.java`、`F/mapper/PipelineTaskMapper.java`。
  - **实现**：Controller 仅用既有权限并从 Principal 取 userId；服务通过 CurrentTenantService 得到 tenantId。根查询和写更新按 `id + tenantId` 进行；列表/日志/执行/阶段查询在分页、聚合、签发 artifact 临时 URL 前过滤。配置/重试/状态变更保留锁、状态机、事务与当前版本语义；不为超级管理员加跨租户数据例外。
  - **验证**：相同权限用户查询异租户 taskId 走相同现有错误路径；跨任务 artifact ID 不签 URL；合法的原个人权限与状态限制结果不变。

- **B02.2 批次绑定原子拒绝并保持 after-commit 发布**
  - **文件** `Modify P/service/impl/PipelineLifecycleServiceImpl.java`、`P/service/impl/PipelineConfigurationServiceImpl.java`、`F/manage/PipelineTaskDataBatchManage.java`、`F/mapper/PipelineTaskDataBatchMapper.java`；调用 B01 的批次租户读取。
  - **实现**：事务内先完整检查所有 batchId 的存在、tenantId、允许的数据类型和既有关联限制，再一次提交；失败整体无绑定记录、任务状态变更或消息。成功启动的现有 after-commit 发布时序不动。
  - **验证**：输入 `[tenant10Batch, tenant20Batch]`，检查绑定行数/任务状态/发布器调用均不变；全 tenant10 合法输入保持既有排序与状态结果。

- **B02.3 以持久化根守住异步写路径**
  - **文件** `Modify X/listener/ExecutionEventListener.java`、`X/processor/ExecutionEventProcessor.java`、`PipelineExecutionProcessor.java`、`PipelineParseExecutionRetryServiceImpl.java`、`X/service/impl/PipelineExecutionServiceImpl.java` 及其调用的 `StageTaskStartProcessor.java`、`StageTaskCompletionProcessor.java`；`Modify E/domain/po/PipelineTaskPO.java` 由 B00 持有，本步骤不重复写。
  - **实现**：所有异步状态/执行记录写入从 pipeline 根恢复 tenant；复核 event 的 task/stage/execution 父链、现有版本与序列后调用现有处理器。不得要求 Worker 协议带 tenant；不得因重复投递破坏现有幂等锁或重试。
  - **验证**：合法事件、重复投递、错配 execution/stage 父 ID、过期版本分别核对状态与执行记录；离线复用既有 `ExecutionEventProcessorTest`，不补新测试类。

## 交付与下游

- **产出**：Pipeline HTTP 与异步主路径按持久化根租户约束；B03 的数据资产/标注/质量消费者遵守相同 task tenant 合同。
- **回传**：列出任务/绑定/查询/消息的实际改动点，注明仍绕过本 Brief 的任务 ID 读写端点；报告已有三类回归命令和结果。任何消息字段/状态/默认值调整须先更新总计划与需求覆盖并重新协调，默认不做。

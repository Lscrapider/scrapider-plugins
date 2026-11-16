# B03 仪表盘与流水线任务旁路

## 范围与输入

- **交付**：[D4 旁路与仪表盘](../PLAN.md#交付与交接)；是 D1–D4 最后一个启用前代码交付。
- **输入**：[R1、R4、固定范围](../../../inputs/requirements.md)、[仪表盘与任务读回源码事实](../../../inputs/source-evidence.md)、[B00 身份服务](tenant-foundation-migration.md)、[B02 task tenant 合同](pipeline-async.md)、[总计划旁路说明](../PLAN.md#目标行为与连接)。
- **依赖**：D3 已集成。business-data-asset、annotation、quality 仅改会读取或更新本题 pipeline task / stage task 的入口，不改各域自身数据模型、权限含义或其他业务。

## 契约与保留行为

所有 pipeline task 派生的指标和任务状态读取先限制为当前 tenant。通过数据集归档/重开、标注列表/抽检、质量门禁结果/按任务规则包查询或更新触达 task 时，使用 Principal userId 解析租户并核验关联根；数据集、标注、质量包的其他独立读写保持现状。不得因为调用方有质量/标注/数据集权限，或超级管理员绕过方法权限，而跳过根任务租户判断。HTTP response/request shape 不变。

## 步骤

- **B03.1 隔离仪表盘聚合**
  - **文件** `Modify Dash/controller/DashboardController.java`、`Dash/service/impl/DashboardServiceImpl.java`；`Modify backend/business/business-dashboard/pom.xml`（依赖已有 `business-common`）。
  - **实现**：将 Principal userId 传给服务；批次数、任务数、近期待办、pipeline 状态、执行计数和列表均在 count/page/limit 前约束 `tenant_id`；不改返回 VO 或统计口径。
  - **验证**：tenant 10 与 20 有不同批次/task/status 数据，对照 dashboard 各接口返回及底层计数，跨 tenant 行为为零；原权限无变化。

- **B03.2 收口数据资产和标注的任务回读**
  - **文件** `Modify Asset/controller/DatasetAssetController.java`、`Asset/service/impl/DatasetAssetServiceImpl.java`；`Modify An/controller/AnnotationCenterController.java`、`AnnotationSpotCheckController.java`、`An/service/impl/AnnotationProjectServiceImpl.java`、`AnnotationSpotCheckServiceImpl.java`。
  - **实现**：仅对触达 pipeline task 的路径增加可信 userId 传递和 task tenant 核验。数据集详情/归档/重开中通过关联 taskId 读/改 task 状态时，跨租户或冲突关联在数据资产更新前拒绝；标注按 task 名称筛选、组装任务名称/状态、抽检查看/标记/完成回调都不得从异租户任务读回。保留现有个人/状态及标注权限。
  - **验证**：tenant 10 调用外租户数据集关联 task 和 annotation 的 taskId 不得返回 task 名称/状态、写入抽检或改 task；同 tenant 的合法操作结果与排序保持。对每种拒绝路径确认 DB/门禁回调不变。

- **B03.3 收口质量端点的 task 旁路**
  - **文件** `Modify Q/controller/QualityGateResultController.java`、`QualityRuleController.java`、`Q/service/impl/QualityGateResultServiceImpl.java`、`QualityRuleServiceImpl.java`；`Modify backend/business/business-governance-quality/pom.xml`（依赖 `business-common`）。
  - **实现**：对 `listTaskResults`、`resolveTaskRuleSet` 及按 taskId 绑定/更新 task 的入口加 tenant 根守卫；仅 task-keyed 路径受影响，质量规则包、问题字典等全局域按现有权限继续。task 存在但属外租户时沿相同任务不存在错误路径。
  - **验证**：用同权限用户跨 tenant 查询门禁/规则包或更新关联，核对响应同错误路径、task 与相关状态无改动；本租户路径保留原数据和错误格式。

## 交付与下游

- **产出**：仪表盘和所有已查明的直接 `PipelineTaskManage` 调用端都受租户守卫；可与 D1–D3 一起进入 D5 验收。
- **回传**：逐项报告每个服务方法与入口、租户来源、拒绝位置、副作用证据；确认 `DatasetAssetServiceImpl`、`AnnotationProjectServiceImpl`、`AnnotationSpotCheckServiceImpl`、`QualityRuleServiceImpl` 中其余 `PipelineTaskPO` 查询是否仅用于已受保护的同一请求或系统级配置。发现新旁路时先更新本 Brief、总计划 D4、场景及 REVIEW，再实施。

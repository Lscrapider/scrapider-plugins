# B00 可信租户基础与兼容迁移结构

## 范围与输入

- **交付**：[D1 可信身份与兼容结构](../PLAN.md#交付与交接)；最终回填与启用由 D5 集成验收门控。
- **需求**：[R1、R5](../../../inputs/requirements.md)；共享路径别名与身份契约见[总计划](../PLAN.md#结果与范围)。
- **来源**：[身份与 schema 事实](../../../inputs/source-evidence.md)。账号租户可被更新，JWT 不携带租户；不能将当前 creator 的租户当作历史归属。
- **开始依赖**：业务仓库根 `AGENTS.md`；总计划 D01–D04；PostgreSQL 现有 `scripts/java-sqls/schema/002-data-source.sql`、`004-pipeline.sql` 与 `upgrade/025-*`。

## 契约与保留行为

HTTP 调用端只传已认证 Principal 的 userId；共享服务从现有账号/租户持久层读取当前值，拒绝账号不存在、空/负 tenantId、正数租户缺失/删除/停用；明确的 0 有效。用户停用继续由每请求认证链路拒绝，登录/续期租户校验与共享服务保持同一规则。客户端不得提交 tenantId；认证失败继续走现有 `invalidToken`、`accountDisabled` 或 `tenantDisabled` 定义。

持久化根仅增加 `DataBatchPO.tenantId` 与 `PipelineTaskPO.tenantId`。租户列可为空以容纳隔离的历史行；新应用的创建路径必须写入非空值。批次名唯一索引只对有归属行按 `(tenant_id, batch_name)` 唯一；平台 0 参加同一约束。准备阶段不删现有全局唯一索引。详细回填和失败边界见总计划 D03–D04 与 D5。

## 步骤

- **B00.1 建立可信租户解析入口**
  - **文件** `Create C/service/CurrentTenantService.java`、`Create C/service/impl/CurrentTenantServiceImpl.java`；`Modify backend/business/business-auth/pom.xml`、`Modify Auth/service/impl/AuthServiceImpl.java`。
  - **实现**：服务方法以 userId 为唯一入参，使用 `UserManage`、`TenantManage` 读取当前账号和租户；0 显式返回，空/负/不可用值按上文拒绝。登录/续期复用同一租户状态规则。无需向 Principal、JWT 或 API 增加 tenant 字段；已有 `business-common` 对基础 DB/Entity 的依赖足够，禁止循环依赖。
  - **验证**：核对调用方只有 `@AuthenticationPrincipal` 提取的 userId；代码路径覆盖有效平台/正数租户、账号不存在、tenantId 空/负、租户删除/停用，并与 `AuthServiceImpl` 原有错误语义一致。此步骤不启动服务、不新增单测。

- **B00.2 预备根归属结构**
  - **文件** `Modify E/domain/po/DataBatchPO.java`、`Modify E/domain/po/PipelineTaskPO.java`；`Modify scripts/java-sqls/schema/002-data-source.sql`、`004-pipeline.sql`；`Create scripts/java-sqls/upgrade/026-tenant-scope-prepare.sql`。
  - **实现**：Entity 映射 `tenant_id`；初始化 schema 与 026 增加可空根列和过滤查询所需索引，不设默认 0。准备升级保持原批次全局唯一索引，确保旧应用忽略新列仍能启动；不做自动回填、不添加租户参数或切换开关。
  - **验证**：在克隆数据库审阅 schema diff；证明新旧应用并存时 DDL 不要求旧应用填写新列，已有表和索引未被提前删除。

- **B00.3 制作显式回填/切换脚本**
  - **文件** `Create scripts/java-sqls/upgrade/027-tenant-scope-cutover.sql`。
  - **实现**：脚本只接受经过审核的根记录映射及可追溯证据，不从当前 `creator_id/created_by` 自动推导租户。先断言重复 ID、无效租户、同批次文件与上传轮次的 batch 不一致、任务绑定跨 tenant；任何已映射冲突即整体中止。未映射/冲突根行保持 NULL 并输出 ID 与原因清单，不得写成 0。映射通过后建 `(tenant_id,batch_name) WHERE tenant_id IS NOT NULL` 唯一索引，再删除旧全局名称索引；若旧全局索引保持可用的前置条件未满足，事务中止。脚本对 pipeline 绑定跨租户同样阻断切换。只在维护窗停写并排空旧应用/任务后执行。
  - **验证**：只读预检与事务回滚演练；构造已映射、未映射、重复名称和父子冲突数据，核对实际更新集合与报告逐条一致，未知行不变且 tenantId 不为 0。失败时保留 026 的兼容列和全局唯一索引，系统保持停写；不得在旧代码仍活动时开放多租户流量。

## 交付与下游

- **产出**：共用 `CurrentTenantService`、两个根 PO 映射、初始/升级 schema 与显式切换脚本；D2–D4 的实现只用此服务解析 HTTP 租户，异步流程只读持久化根记录。
- **回传**：完成步骤、实际 schema diff、预检/回滚/切换演练证据、未归属及关系冲突清单；未完成 D5 条件须注明数量和阻断项。所有调整需先更新总计划的决策、交付与验收，再派发依赖工作。

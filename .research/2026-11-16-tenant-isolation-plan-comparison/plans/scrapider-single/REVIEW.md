# 平台业务空间租户隔离首批切片评审计划

## 范围与输入

- **范围**：集成后的批次、上传、流水线、异步、看板及对本题根/子记录的资产与标注读回变化；对照执行时工作树起始状态及 [PLAN.md](PLAN.md)。
- **计划锚点**：[requirements.md](../../inputs/requirements.md)、[source-evidence.md](../../inputs/source-evidence.md)、PLAN 的目标契约、实施步骤、验收与代表性复演。
- **证据**：合并后的现有回归结果；逐项 HTTP/DB/MQ/对象存储/URL 验收记录；存量映射来源、未归属与冲突报告、旧写入停止和排空证据。静态推演不得替代获准 fixture 的验收。评审不承担缺失验证或实现修复。

## 功能评审

**角色**：scrapider-code-reviewer

检查是否完整落实 R1–R5 与计划交付，重点回答：

1. 是否所有读写都同时保留功能权限并从可信认证主体取租户；0、父/子租户语义是否明确；客户端不能指定/覆盖 tenantId；失效身份按原错误方式拒绝。
2. 批次列表/详情/计数/名称唯一检查是否先过滤再分页；更新是否不能转移。文件、回调、分片、ZIP、预签名和删除是否在任何副作用前核对真实父子 ID；跨租户 MD5 是否不暴露命中；历史共享物理对象是否保留全局引用保护。
3. pipeline 根的创建、列表/详情、配置、绑定、运行/重试、阶段/执行/日志/产物是否全部按根范围；混租户绑定是否整体拒绝且不发布消息；异步事件是否由持久根还原归属并继续核对父子、版本、序列，重复投递仍幂等。
4. 看板过滤是否发生于数据库聚合前；DatasetAssetServiceImpl、AnnotationProjectServiceImpl、AnnotationSpotCheckServiceImpl 及其它已证实调用是否未留下可返回本题对象的旁路。
5. 迁移是否仅对证据充分的记录赋值；未知/冲突数据是否 NULL 隔离且报告；默认值、错误、HTTP、状态机、运行参数和消息协议是否维持；切换失败路径是否不会回到全局读写旧版本。
6. 是否有满足 C01–C04 的请求、数据库、消息、对象存储/签名及迁移证据；缺少真实 fixture 的项应明确保留为未验收。

## 规范评审

**角色**：scrapider-standards-reviewer

按当前副本 AGENTS.md 与 ~/study/skill/scrapider-plugins/plugins/scrapider-guidelines/skills/scrapider-guidelines/SKILL.md 审查；适用引用至少包括 references/shared/code-design-and-changes.md、references/shared/validation-and-boundaries.md、references/java/spring-boot-backend.md、references/java/spring-boot-architecture.md、references/java/spring-boot-http-and-domain.md、references/java/spring-boot-data-access.md、references/java/spring-boot-messaging.md、references/java/spring-boot-multi-module.md、references/shared/standards-review.md。

重点确认 Controller/Service/Manage/Mapper 与 Listener/Publisher 职责、租户条件是否由可验证的请求边界传入、SQL 查询和唯一索引责任、必要 ID/状态检查是否位于能阻止副作用的位置，且没有跨层重复校验、直接跨层访问、无依据抽象、租户默认值、协议改动或无授权新测试。按规范审查流程提交只读报告；主线在 PLAN 的评审记录处逐项处置并对修复点复查。

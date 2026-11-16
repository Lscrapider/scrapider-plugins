# 批次与流水线按租户隔离审查计划

## 范围与输入

- **范围**：集成后的 D1–D4 代码、PostgreSQL 初始/升级 SQL、D5 迁移与启用证据；对照执行开始时记录的 checkout 和工作树基线。
- **计划引用**：[`PLAN.md`](PLAN.md)、[B00](briefs/tenant-foundation-migration.md)、[B01](briefs/data-batch-upload.md)、[B02](briefs/pipeline-async.md)、[B03](briefs/task-readback-dashboard.md)、[共同需求](../../inputs/requirements.md)、[共同源码事实](../../inputs/source-evidence.md)。审查范围包含每个 Brief 的路径清单与调整记录。
- **项目指令**：业务副本根目录 `AGENTS.md`；Scrapider Guidelines 根目录 `~/study/skill/scrapider-plugins/plugins/scrapider-guidelines/skills/scrapider-guidelines/`，重点检查 Spring Boot Backend、HTTP and Domain、Data Access、Messaging、Code Design and Changes、Validation and Boundaries、Standards Review。
- **证据**：收集 D5 的既有回归命令结果、C01–C06 HTTP/DB/MQ/对象存储证据、存量预检/映射/冲突清单、暂停与排空旧写入记录、切换/失败恢复记录；静态推理不得代替真实租户 fixture 证据。

## 功能审查

**角色** `scrapider-code-reviewer`

检查 R1–R5 全覆盖和 D1–D5 顺序：可信 userId 解析与有效租户状态；tenant 0/父子隔离；既有个人、权限、状态限制；批次分页/计数/名字约束；所有 file/upload/session/archive/sync ID 父链及拒绝副作用；MD5 跨租户与全局物理引用；pipeline mixed bind 原子拒绝、after-commit 发送；异步持久化父记录/版本/幂等；Dashboard 与 Asset/Annotation/Quality 旁路；未归属/冲突存量和旧写入门槛。逐项对照 C01–C06 的观测证据，尤其检查是否有绕过被保护根记录的入口，以及消息/URL/对象存储是否在授权前产生副作用。

## 规范审查

**角色** `scrapider-standards-reviewer`

按上述业务副本 `AGENTS.md` 和给定 Scrapider Guidelines 根，审查所有触及的 Spring Boot 模块、跨模块服务接口、PO/SQL/索引、事务、MQ 入口/发布、临时 URL 和错误边界；核对 Service/Manage/Mapper/Converter 边界、现有默认值和协议保留，以及所有新增依赖方向。读取完成代码及相关调用方；该审查不替代功能验收或 D5 数据迁移证据。

# 共同源码事实与已跑检查

业务副本为无提交的工作树。[源码指纹](../source-fingerprint.json)固定同一份输入。精确路径以原仓为准。以下是已知现状，具体改法由各写作者决定。

- **身份**：UserPO:37-45 有 tenantId/tenantLevel。JwtTokenService:70-122 的凭证不含租户。JwtAuthenticationProvider:38-55 每次从用户 ID 重取账号，DatabaseUserPrincipal:22-70 没携带租户。AuthServiceImpl:47-81,113-138 在登录/续期查看租户状态。RbacConstants:13-23 以 0 表示平台，租户树最多两级。UserServiceImpl:108-140 可改变账号现有租户，当前账号租户因此不能直接证明历史创建归属。SuperAdminMethodSecurityExpressionHandler:18-23,34-69,85-103 对超级管理员放行方法权限。MybatisPlusConfig:17-22 只注册分页，CurrentUserIdProvider 是审计用用户 ID SPI。
- **表和归属**：scripts/java-sqls/schema/002-data-source.sql:13-68 批次 creator_id 可空，名称唯一索引目前全局，上传轮次和文件有 batch_id，文件 upload_id 关联轮次。003-file-chunk-upload.sql:3-36 有会话/分片。004-pipeline.sql:135-205 有任务 created_by/绑定表；223-315 有阶段、执行、raw_file 关系，业务根没有租户列，外键不能替代所有跨表一致性判断。
- **批次读写**：business-data-manager 的 DataBatchController:57-98 使用 Principal userId 与功能权限。DataBatchServiceImpl:88-159 查询、分页和名字检查无租户；162-266 涉及子文件、URL、轮次；428-531 删除先后包含 MinIO、数据库与重算。BatchFileManage:35-74 有历史物理对象的全局引用保护。
- **上传旁路**：FileUploadController:117-163、ChunkUploadServiceImpl:252-359 的分片处理从 fileId/uploadId 找会话；后者 160-171/452-483 按全局 MD5 复用 objectKey。ArchiveUploadServiceImpl:129-169 写 creatorId，结果仅按 taskId 取；ArchiveUploadTaskExecutor:136-148 执行异步存储步骤。FileUploadServiceImpl:122-153 的文件回调按 ID 更新状态和统计。BatchFileMapper:19-53、DataBatchMapper:28-37 有自定义读写。DashboardServiceImpl:103-131,331-335 直接调 Manage 统计。
- **流水线与异步**：PipelineLifecycleController、PipelineConfigurationController、PipelineStageExecutionController、PipelineTaskLogController 是已知 HTTP 入口。PipelineTaskPO 没有租户。ExecutionEventProcessor 有按 pipelineTaskId 锁父、按 executionTaskId 加载、检查父关系/版本/序列。命令和回执有 pipelineTaskId/stageTaskId/executionTaskId 及运行/执行版本，当前无租户字段。追踪运行命令的 afterCommit 发布和执行详情签发的临时访问链接。business-data-asset 或 annotation 有读回流水线的路径，核对是否触达本题对象时保持边界。

**实际基线**：临时复制 backend，使用 Maven 3.9.16 / Java 17 离线运行：
```sh
mvn -o -B -f backend/pom.xml -pl business/business-governance-pipeline,business/business-governance-execution -am -Dtest=PipelineLifecycleServiceImplTest,PipelineConfigurationServiceImplTest,ExecutionEventProcessorTest -Dsurefire.failIfNoSpecifiedTests=false test
```
3 个现有测试类、45 个用例通过。业务数据管理模块无既有 src/test。源代码和既有测试可作为编写计划的事实；新隔离未实施，真实联调需要将来授权的 fixture。

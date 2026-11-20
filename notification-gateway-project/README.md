# notification-gateway-project

Provider-neutral source; no service-space ID, URL or secret is embedded. Remote deployment is UNCONFIRMED.

Human deployment/configuration and verification instructions are maintained only at:
[E:/MyWork/Codex/经销商下单系统/功能文档/APP消息通知/设计与接口资料/notification-gateway部署与配置.md](E:/MyWork/Codex/经销商下单系统/功能文档/APP消息通知/设计与接口资料/notification-gateway部署与配置.md)

Local commands: `npm test`; build `tests/dotnet/SignatureProbe.csproj` offline into `.artifacts/signature-probe`, then `npm run test:compat`. Tests use synthetic credentials and durable local SQLite, never UniPush or a business database. Node 24+ is needed only by the SQLite test harness; the deployed cloud function does not load SQLite.

`prepare-deployment.cjs` requires the actual provider argument (`aliyun` or `tcb`) and a new absolute local output directory. It only copies local deployment assets; it never uploads or changes remote settings. Confirm the provider/space before running it. For other providers, use the HBuilderX-created directory corresponding to the actual space and copy the same function/database assets after review.
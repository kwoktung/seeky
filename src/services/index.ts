// 导出基础服务类
import { type Context } from "@/lib/context";

// 导出所有服务类
import { LookupService } from "./lookup";
import { DomainAIService } from "./domain-ai";

export class Services {
  constructor(private readonly ctx: Context) {}
  get whois() {
    return new LookupService(this.ctx);
  }
  get domainAI() {
    return new DomainAIService(this.ctx);
  }
}

// 导出基础服务类
import { type Context } from "@/lib/context";

// 导出所有服务类
import { WhoisService } from "./whois";
import { DomainAIService } from "./domain-ai";

export class Services {
  constructor(private readonly ctx: Context) {}
  get whois() {
    return new WhoisService(this.ctx);
  }
  get domainAI() {
    return new DomainAIService(this.ctx);
  }
}

// 导出基础服务类
import { type Context } from "@/lib/context";

// 导出所有服务类
import { BookService } from "./book";
import { WhoisService } from "./whois";

export class Services {
  constructor(private readonly ctx: Context) {}
  get book() {
    return new BookService(this.ctx);
  }
  get whois() {
    return new WhoisService(this.ctx);
  }
}

// <define:__ROUTES__>
var define_ROUTES_default = {
  version: 1,
  include: [
    "/api/*"
  ],
  exclude: []
};

// C:/Users/Administrator/AppData/Roaming/npm/node_modules/wrangler/templates/pages-dev-pipeline.ts
import worker from "D:\\living\\skill\\living skills\\coding skill\\XaFaART\\.wrangler\\tmp\\pages-rCIHSF\\functionsWorker-0.4857989293607543.mjs";
import { isRoutingRuleMatch } from "C:\\Users\\Administrator\\AppData\\Roaming\\npm\\node_modules\\wrangler\\templates\\pages-dev-util.ts";
export * from "D:\\living\\skill\\living skills\\coding skill\\XaFaART\\.wrangler\\tmp\\pages-rCIHSF\\functionsWorker-0.4857989293607543.mjs";
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = worker;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env, context);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  pages_dev_pipeline_default as default
};
//# sourceMappingURL=gwlsfgwuf1j.js.map

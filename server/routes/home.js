const Router = require("koa-router");
const router = new Router();
const {launch} = require('../controller/launch')

router.get("/", (ctx) => {
  ctx.body = "<h1>主页....</h1>";
});

router.post("/launch", async (ctx)=>{
  const result = await launch(ctx)
  ctx.body = result
});

module.exports = router;

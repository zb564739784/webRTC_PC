package com.zb.verticle;

import com.zb.handler.PorcessHandler;
import io.vertx.core.AbstractVerticle;
import io.vertx.core.Future;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.sockjs.SockJSHandler;
import io.vertx.ext.web.handler.sockjs.SockJSHandlerOptions;

/**
 * Created by Administrator on 2017/10/15.
 */
public class HttpServerVerticle extends AbstractVerticle {


    @Override
    public void start(Future<Void> startFuture) throws Exception {
        Router router = Router.router(vertx);

        router.get("/userList").handler(routingContext -> {
            JsonArray jsonArray=new JsonArray();
            PorcessHandler.pool.forEach((k,v)->jsonArray.add(v));//获取在线的用户
            routingContext.response().end(new JsonObject().put("msg","ok").put("datalist",jsonArray).toString());
        });//测试

        //创建http服务器
        vertx.createHttpServer()
                .requestHandler(router::accept).listen(config().getInteger("http-port", 8090),
                config().getString("host-name", "0.0.0.0"));


        SockJSHandlerOptions options = new SockJSHandlerOptions().setHeartbeatInterval(2000);

        SockJSHandler sockJSHandler = SockJSHandler.create(vertx, options);

        //信令服务端处理
        PorcessHandler porcessHandler=new PorcessHandler();

        sockJSHandler.socketHandler(sockJSSocket -> {
            System.out.println("======have you connection===");
            // Just echo the data back
            sockJSSocket.handler(buffer ->porcessHandler.process(buffer,sockJSSocket));
            //end
            sockJSSocket.endHandler(socket->porcessHandler.closeOrException(sockJSSocket));
            //exception
            sockJSSocket.exceptionHandler(socket->porcessHandler.closeOrException(sockJSSocket));
        });

        router.route("/myapp/*").handler(sockJSHandler);//sockjs路径

        startFuture.complete();
    }

}

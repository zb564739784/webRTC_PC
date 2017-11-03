package com.zb.handler;

import io.vertx.core.buffer.Buffer;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.handler.sockjs.SockJSSocket;

import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Created by zhangbo on 17-10-12.
 */
public class PorcessHandler {

    public static final ConcurrentHashMap<SockJSSocket,String> pool = new ConcurrentHashMap<>();

    /**
     * webSocket连接处理
     *
     * @param buffer
     */
    public  void process(Buffer buffer, SockJSSocket sockJSSocket) {
        //accepting only JSON messages
        JsonObject jsonObject = null;
        try {
            jsonObject = new JsonObject(new String(buffer.getBytes()));
        } catch (Exception e) {
            System.out.println("Invalid JSON");
        }

        String conn="";
        switch (jsonObject.getString("type")) {
            case "login"://登录处理
                System.out.println("User logged"+jsonObject.getString("name"));
                //if anyone is logged in with this username then refuse
                if(Objects.nonNull(sockJSSocket)) {
                    pool.put(sockJSSocket,jsonObject.getString("name"));
                    speakToAllExceptMe(jsonObject.getString("name"),new JsonObject().put("type","login").put("success",true).toString());
                }
                break;
            case "offer"://获取offer转交call的用户
                //for ex. UserA wants to call UserB
                System.out.println("User params:" + jsonObject.toString());
                System.out.println("User logged" + jsonObject.getString("name"));
                //if UserB exists then send him offer details
                conn = jsonObject.getString("name");
                if (conn != null) {
                    //setting that UserA connected with UserB
                    if (pool.size() > 0) {
                        speakToAllExceptMe(jsonObject.getString("connectedUser"), new JsonObject().put("type", "offer").put("offer", jsonObject.getValue("offer"))
                                .put("name",pool.get(sockJSSocket)).toString());
                    }
                }
                break;
            case "answer"://call的用户回传answer
                System.out.println("User logged"+jsonObject.getString("name"));
                //for ex. UserB answers UserA
                conn = jsonObject.getString("name");
                if(conn != null) {
                    //setting that UserA connected with UserB
                    if(pool.size()>0){
                        speakToAllExceptMe(jsonObject.getString("connectedUser"),new JsonObject().put("type","answer").put("answer",jsonObject.getValue("answer")).toString());
                    }
                }
                break;
            case "candidate"://申请者
                System.out.println("User logged"+jsonObject.getString("name"));
                conn = jsonObject.getString("name");
                if(conn != null) {
                    if(pool.size()>0){
                        speakToAllExceptMe(jsonObject.getString("name"),new JsonObject().put("type","candidate").put("candidate",jsonObject.getValue("candidate")).toString());
                    }
                }
                break;
            case "leave"://离开
                System.out.println("User logged"+jsonObject.getString("name"));
                conn = jsonObject.getString("name");
                if(conn != null) {
                    if(pool.size()>0){
                        speakToAllExceptMe(jsonObject.getString("name"),new JsonObject().put("type","leave").toString());
                    }
                }
                break;
            default:
                System.out.println("User logged"+jsonObject.getString("name"));
                conn = jsonObject.getString("name");
                if(conn != null) {
                    if(pool.size()>0){
                        speakToAllExceptMe(jsonObject.getString("name"),new JsonObject().put("type","error").put("message","Command not found").toString());
                    }
                }
                break;
        }

    }

    /**
     * 断开或异常处理
     *
     */
    public  void closeOrException(SockJSSocket sockJSSocket) {
        pool.remove(sockJSSocket);
    }


    /**
     * send message
     * @param name
     * @param msg
     */
    public void speakToAllExceptMe(String name, String msg) {
        pool.forEach((k, v) -> {
            if (v.equals(name)) {
                System.out.println("send "+name+" Message:" + msg);
                k.write(msg);
            }
        });
    }
}

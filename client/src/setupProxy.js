const proxy = require('http-proxy-middleware')
const os = require('os')

// 获取本机内网IP地址
function getLocalIP() {
  const interfaces = os.networkInterfaces()
  console.log(interfaces)
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部（即非局域网）和非IPv4地址
      if (iface.netmask === '255.255.0.0') {
        return iface.address
      }
    }
  }
  return '127.0.0.1' // 如果没有找到内网IP，返回本地回环地址
}

const localIP = getLocalIP()
console.log(`使用本机内网IP地址: ${localIP}`)
//循环输出2 10次
for (let i = 0; i < 10; i++) {
  console.log(i)
}

module.exports = function (app)  {
  app.use(
    // 代理 1
    proxy.createProxyMiddleware('/api', {             // 匹配到 '/api' 前缀的请求，就会触发该代理配置
      target: `http://${localIP}:3001/api`,  // 请求转发地址
      changeOrigin: true,                             // 是否跨域
      /*
        changeOrigin 为 true 时，服务器收到的请求头中的host为：127.0.0.1:6000，也就是代理地址的 host
        changeOrigin 为 false 时，服务器收到的请求头中的host为：localhost:3000，也就是本地站点地址的 host
        changeOrigin 默认 false，但一般需要将 changeOrigin 值设为 true，根据自己需求调整
      */
      pathRewrite: {
        '^/api': ''                                   // 重写请求路径
      }
    })
  )
}

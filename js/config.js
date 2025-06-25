// js/config.js

// --- 核心修改：動態設定後端 API 的基本 URL ---

let API_BASE_URL;

// 判斷當前運行的前端是正式版 ('/Mai/') 還是測試版 ('/MD/')
if (window.location.pathname.startsWith('/Mai/')) {
    // 當處於正式版環境 (https://msw2004727.github.io/Mai/)
    // 【請務必將 'https://your-production-backend-url/api/MD' 替換成您正式版後端的真實網址】
    API_BASE_URL = 'https://your-production-backend-url/api/MD'; 
    console.log("偵測到正式版前端，連接至正式版後端。");

} else {
    // 當處於測試版環境 (https://msw2004727.github.io/MD/) 或其他開發環境
    API_BASE_URL = 'https://md-server-5wre.onrender.com/api/MD';
    console.log("偵測到測試版前端，連接至測試版後端。");
}

console.log(`API Base URL set to: ${API_BASE_URL}`);

// 如果將來有前端直接調用的 AI API 金鑰 (例如 DeepSeek)，可以在此處添加
// const DEEPSEEK_API_KEY = "sk-your-deepseek-api-key";

// 導出配置 (如果使用模塊系統)
// export { API_BASE_URL };

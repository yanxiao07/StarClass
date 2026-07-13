import { Request, Response } from 'express';
import https from 'https';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';

const SYSTEM_PROMPT = '你是一位专业的教师。';

export const chatWithAI = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '消息格式错误' });
    }

    if (!DASHSCOPE_API_KEY) {
      console.error('DASHSCOPE_API_KEY 未配置');
      return res.status(500).json({ error: 'AI服务未配置，请联系管理员' });
    }

    console.log('通义千问API密钥已加载，长度:', DASHSCOPE_API_KEY.length);

    const requestMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await callDashScope(requestMessages);

    res.json({ content: response });
  } catch (error) {
    console.error('AI聊天错误:', error);
    res.status(500).json({ error: 'AI服务暂时不可用，请稍后重试' });
  }
};

async function callDashScope(messages: any[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'qwen-turbo',
      input: { messages: messages },
      parameters: {
        result_format: 'message',
        temperature: 0.7,
        top_p: 0.8
      }
    });

    console.log('请求通义千问API...');

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      port: 443,
      path: '/api/v1/services/aigc/text-generation/generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      console.log('通义千问响应状态码:', res.statusCode);
      
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        console.log('通义千问响应内容:', responseBody);
        
        try {
          const result = JSON.parse(responseBody);
          
          if (result.code) {
            reject(new Error(result.message || 'AI服务调用失败'));
            return;
          }

          if (result.output && result.output.choices && result.output.choices.length > 0) {
            const content = result.output.choices[0].message.content;
            resolve(content);
          } else {
            reject(new Error('AI返回格式错误'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('通义千问请求错误:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

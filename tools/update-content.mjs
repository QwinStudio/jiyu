import { readFile, writeFile } from 'node:fs/promises';
import readline from 'node:readline/promises';
const file=new URL('../data/content.json',import.meta.url),rl=readline.createInterface({input:process.stdin,output:process.stdout});
const ask=(label)=>rl.question(`${label}: `);const data=JSON.parse(await readFile(file,'utf8'));
console.log('\n添加视频资料（留空则使用默认链接）');
const title=await ask('视频标题');if(!title){console.log('已取消。');rl.close();process.exit();}
const date=await ask('发布时间（例如 2026.07.25）');const description=await ask('注释');const cover=await ask('封面路径（例如 media/cover-new.jpg）');
const bilibili=await ask('哔哩哔哩链接')||'https://www.bilibili.com/';const douyin=await ask('抖音链接')||'https://www.douyin.com/';const xiaohongshu=await ask('小红书链接')||'https://www.xiaohongshu.com/';
data.videos.unshift({id:`video-${Date.now()}`,title,date,description,cover,bilibili,douyin,xiaohongshu});await writeFile(file,JSON.stringify(data,null,2)+'\n');console.log('已写入 data/content.json。');rl.close();

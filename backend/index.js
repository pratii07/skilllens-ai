import express from 'express'; import cors from 'cors'; import mongoose from 'mongoose'; import dotenv from 'dotenv'; import {fileURLToPath} from 'url'; import path from 'path'; import User from './models/User.js'; import bcrypt from 'bcryptjs'; import authRoutes from './routes/auth.js'; import assessmentRoutes from './routes/assessments.js'; import {connectDatabase} from './db/connect.js';
const backendDir=path.dirname(fileURLToPath(import.meta.url)); dotenv.config({path:path.resolve(backendDir,'../.env')});
const production=process.env.NODE_ENV==='production';
const allowedOrigins=(process.env.FRONTEND_URL||'').split(',').map(value=>{try{return new URL(value.trim()).origin}catch{return ''}}).filter(Boolean);
if(production&&(!process.env.MONGODB_URI||!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32||!allowedOrigins.length))throw new Error('Production requires MONGODB_URI, FRONTEND_URL, and a JWT_SECRET of at least 32 characters');
const app = express();
app.use(cors({origin(origin,callback){if(!production||!origin)return callback(null,true);try{return callback(null,allowedOrigins.includes(new URL(origin).origin))}catch{return callback(null,false)}}}));
app.use(express.json({ limit: '5mb' }));
app.get('/api/health', (req, res) => {const mongo=mongoose.connection.readyState===1?'connected':'disconnected';return res.status(mongo==='connected'?200:503).json({status:mongo==='connected'?'ok':'degraded',mongo})});
app.use('/api',(req,res,next)=>{if(production&&mongoose.connection.readyState!==1)return res.status(503).json({error:'Database is unavailable. Please try again shortly.'});next()});
app.use('/api/auth', authRoutes); app.use('/api/assessments', assessmentRoutes);
async function startDatabase() {
  try {
    await connectDatabase();
    const mentor = await User.findOne({role:'mentor'});
    if (!mentor&&process.env.NODE_ENV!=='production') await User.create({name: 'Prateiksha', email: 'skillens@gmail.com', password: await bcrypt.hash('prateiksha123', 10), role: 'mentor'});
    if(!mentor&&process.env.NODE_ENV==='production'&&process.env.INITIAL_MENTOR_EMAIL&&process.env.INITIAL_MENTOR_PASSWORD){
      await User.create({name:process.env.INITIAL_MENTOR_NAME||'Mentor',email:process.env.INITIAL_MENTOR_EMAIL.trim().toLowerCase(),password:await bcrypt.hash(process.env.INITIAL_MENTOR_PASSWORD,12),role:'mentor'});
    }
    console.log('MongoDB Atlas connected to SkillLens database');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    setTimeout(startDatabase, 30000);
  }
}
app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ error: process.env.NODE_ENV==='production'?'Internal server error':err.message||'Internal server error' }) }); const port = process.env.PORT || 4000; startDatabase(); app.listen(port, () => console.log(`SkillLens API listening on port ${port}`));

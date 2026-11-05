import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Submission from '../models/Submission.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';

const router=express.Router();
const demoPracticeScores=new Map();
const demoPracticeCheckIns=new Map();
const secret=()=>process.env.JWT_SECRET||'development-only-secret-change-me';
const mentorEmail='skillens@gmail.com';
const connected=()=>Boolean(process.env.MONGODB_URI&&User.db?.readyState===1);
const validUserObjectId=id=>User.db.base.Types.ObjectId.isValid(String(id||''));
const practiceDateKey=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const applyPracticeCheckIn=(current,now=new Date())=>{
  const today=practiceDateKey(now);
  if(current.lastPracticeDate===today)return {...current,alreadyCheckedIn:true};
  const yesterday=practiceDateKey(new Date(now.getTime()-86400000));
  const practiceStreak=current.lastPracticeDate===yesterday?(Number(current.practiceStreak)||0)+1:1;
  const certificates=Array.isArray(current.certificates)?[...current.certificates]:[];
  if((practiceStreak===7||practiceStreak===30)&&!certificates.some(item=>item.name===`${practiceStreak}-Day Learning Streak`))certificates.push({name:`${practiceStreak}-Day Learning Streak`,earnedAt:now,reason:`Completed ${practiceStreak} consecutive days of practice`});
  return {xp:(Number(current.xp)||0)+10,practiceStreak,longestStreak:Math.max(Number(current.longestStreak)||0,practiceStreak),lastPracticeDate:today,certificates,alreadyCheckedIn:false};
};
const demoAccounts={
  [mentorEmail.toLowerCase()]:{id:'demo-mentor',name:'Prateiksha',email:mentorEmail,password:'prateiksha123',role:'mentor'}
};

router.post('/login',async(req,res)=>{
  const {email,password}=req.body;
  if(!email||!password)return res.status(400).json({error:'Email and password are required'});
  const normalized=email.trim().toLowerCase();
  if(!connected()){
    const account=demoAccounts[normalized];
    if(!account||account.password!==password)return res.status(401).json({error:'Invalid email or password'});
    const user={id:account.id,name:account.name,email:account.email,role:account.role,verified:true};
    return res.json({token:jwt.sign(user,secret()),user});
  }
  const user=await User.findOne({email:normalized}).select('+password');
  if(!user||!await bcrypt.compare(password,user.password))return res.status(401).json({error:'Invalid email or password'});
  if(user.accountStatus && user.accountStatus !== 'active')return res.status(403).json({error:'This account is inactive or suspended'});
  const safe={id:user._id,name:user.name,email:user.email,role:user.role==='student'?'student':user.role==='admin'?'admin':'mentor',verified:true};
  res.json({token:jwt.sign(safe,secret()),user:safe});
});

router.post('/register',async(req,res)=>{
  const {name,email,password}=req.body;
  if(!name||!email||!password)return res.status(400).json({error:'Name, email and password are required'});
  if(String(password).length<6)return res.status(400).json({error:'Password must be at least 6 characters'});
  const normalized=email.trim().toLowerCase();
  if(normalized===mentorEmail)return res.status(403).json({error:'This email is assigned to the mentor account'});
  if(!connected()){
    demoAccounts[normalized]={id:`demo-student-${Date.now()}`,name:String(name).trim(),email:normalized,password,role:'student'};
    const safe={id:demoAccounts[normalized].id,name:demoAccounts[normalized].name,email:normalized,role:'student',verified:true};
    return res.json({token:jwt.sign(safe,secret()),user:safe});
  }
  try{
    if(await User.findOne({email:normalized}))return res.status(409).json({error:'An account already exists with this email'});
    const user=await User.create({name:String(name).trim(),email:normalized,password:await bcrypt.hash(password,10),role:'student'});
    const safe={id:user._id,name:user.name,email:user.email,role:'student',verified:true};
    return res.json({token:jwt.sign(safe,secret()),user:safe});
  }catch(error){return res.status(400).json({error:error.message||'Unable to create student account'})}
});

const currentUser=async(req,res,next)=>{
  try {
    const header=req.headers.authorization||'';
    if(!header.startsWith('Bearer '))return res.status(401).json({error:'Unauthorized'});
    req.authUser=jwt.verify(header.slice(7),secret());
    next();
  } catch(error) { return res.status(401).json({error:'Unauthorized'}); }
};

router.get('/me',currentUser,async(req,res)=>{
  if(!connected()||!validUserObjectId(req.authUser.id))return res.json({user:{...req.authUser,...(demoPracticeCheckIns.get(String(req.authUser.id))||{}),practiceGameScore:demoPracticeScores.get(String(req.authUser.id))??req.authUser.practiceGameScore??0}});
  const user=await User.findById(req.authUser.id);
  if(!user)return res.json({user:req.authUser});
  const role=user.role==='student'?'student':user.role==='admin'?'admin':'mentor';
  res.json({user:{id:user._id,name:user.name,email:user.email,role,verified:user.verified!==false,accountStatus:user.accountStatus,xp:user.xp||0,practiceGameScore:user.practiceGameScore||0,houseName:user.houseName||'',className:user.className||'',rollNumber:user.rollNumber||'',profilePhoto:user.profilePhoto||'',practiceStreak:user.practiceStreak||0,longestStreak:user.longestStreak||0,lastPracticeDate:user.lastPracticeDate||'',certificates:user.certificates||[]}});
});

router.post('/practice/check-in',currentUser,async(req,res)=>{
  if(req.authUser.role!=='student')return res.status(403).json({error:'Only students can check in for practice'});
  if(!connected()||!validUserObjectId(req.authUser.id)){
    const id=String(req.authUser.id);
    const previous=demoPracticeCheckIns.get(id)||{...req.authUser,xp:0,practiceStreak:0,longestStreak:0,lastPracticeDate:'',certificates:[]};
    const updated=applyPracticeCheckIn(previous);
    demoPracticeCheckIns.set(id,updated);
    return res.json(updated);
  }
  const user=await User.findOne({_id:req.authUser.id,role:'student'});
  if(!user)return res.status(404).json({error:'Student account not found'});
  const updated=applyPracticeCheckIn(user.toObject());
  if(!updated.alreadyCheckedIn){user.xp=updated.xp;user.practiceStreak=updated.practiceStreak;user.longestStreak=updated.longestStreak;user.lastPracticeDate=updated.lastPracticeDate;user.certificates=updated.certificates;await user.save();}
  const {xp,practiceStreak,longestStreak,lastPracticeDate,certificates,alreadyCheckedIn}=updated;
  return res.json({xp,practiceStreak,longestStreak,lastPracticeDate,certificates,alreadyCheckedIn});
});

router.post('/practice/game-score',currentUser,async(req,res)=>{
  const delta=Number(req.body.delta);
  if(!Number.isFinite(delta)||![-10,10].includes(delta))return res.status(400).json({error:'Invalid practice score change'});
  const forceReset=req.body.reset===true;
  if(!connected()||!validUserObjectId(req.authUser.id)){
    const id=String(req.authUser.id);
    const previousScore=demoPracticeScores.get(id)??Number(req.authUser.practiceGameScore||0);
    const nextScore=Math.max(0,previousScore+delta);
    const reachedMilestone=forceReset||(previousScore<100&&nextScore>=100);
    const practiceGameScore=reachedMilestone?0:nextScore;
    demoPracticeScores.set(id,practiceGameScore);
    return res.json({practiceGameScore,practiceMilestoneReached:reachedMilestone});
  }
  const user=await User.findOne({_id:req.authUser.id,role:'student'});
  if(!user)return res.status(404).json({error:'Student account not found'});
  const previousScore=user.practiceGameScore||0;
  const nextScore=Math.max(0,previousScore+delta);
  const reachedMilestone=forceReset||(previousScore<100&&nextScore>=100);
  user.practiceGameScore=reachedMilestone?0:nextScore;
  await user.save();
  return res.json({practiceGameScore:user.practiceGameScore,practiceMilestoneReached:reachedMilestone});
});

router.put('/me',currentUser,async(req,res)=>{
  const name=String(req.body.name||'').trim();
  const email=String(req.body.email||'').trim().toLowerCase();
  if(!name)return res.status(400).json({error:'Name cannot be empty'});
  if(!/^([^\s@]+)@([^\s@]+\.[^\s@]+)$/.test(email))return res.status(400).json({error:'Enter a valid email address'});
  const objectIdValid=validUserObjectId(req.authUser.id);
  if(!connected()||!objectIdValid){
    const account=Object.values(demoAccounts).find(item=>item.id===String(req.authUser.id));
    if(!account)return res.status(404).json({error:'Demo account not found. Please sign in again.'});
    const emailOwner=Object.values(demoAccounts).find(item=>item.email.toLowerCase()===email&&item.id!==account.id);
    if(emailOwner)return res.status(409).json({error:'An account already exists with this email'});
    const oldEmail=account.email.toLowerCase();
    if(oldEmail!==email){delete demoAccounts[oldEmail];account.email=email;demoAccounts[email]=account;}
    account.name=name;
    const safe={id:account.id,name:account.name,email:account.email,role:account.role,verified:true,xp:Number(req.body.xp)||0,practiceGameScore:Number(req.body.practiceGameScore)||0,houseName:String(req.body.houseName||'').trim(),className:String(req.body.className||'').trim(),rollNumber:String(req.body.rollNumber||'').trim(),profilePhoto:String(req.body.profilePhoto||''),practiceStreak:Number(req.body.practiceStreak)||0,longestStreak:Number(req.body.longestStreak)||0,lastPracticeDate:String(req.body.lastPracticeDate||''),certificates:Array.isArray(req.body.certificates)?req.body.certificates:[]};
    return res.json({token:jwt.sign(safe,secret()),user:safe});
  }
  const existing=await User.findOne({email,_id:{$ne:req.authUser.id}});
  if(existing)return res.status(409).json({error:'An account already exists with this email'});
  const updates={name,email,houseName:String(req.body.houseName||'').trim(),className:String(req.body.className||'').trim(),rollNumber:String(req.body.rollNumber||'').trim(),profilePhoto:String(req.body.profilePhoto||'')};
  const previous=await User.findById(req.authUser.id);
  if(!previous)return res.status(404).json({error:'Student or mentor account not found'});
  const oldEmail=previous.email;
  const user=await User.findByIdAndUpdate(req.authUser.id,{ $set: updates},{new:true,runValidators:true});
  if(oldEmail!==email){await Submission.updateMany({studentEmail:oldEmail},{ $set:{studentEmail:email}});await AssessmentAttempt.updateMany({studentEmail:oldEmail},{ $set:{studentEmail:email}});}
  const role=user.role==='student'?'student':user.role==='admin'?'admin':'mentor';
  const safe={id:user._id,name:user.name,email:user.email,role,verified:user.verified!==false,xp:user.xp||0,practiceGameScore:user.practiceGameScore||0,houseName:user.houseName||'',className:user.className||'',rollNumber:user.rollNumber||'',profilePhoto:user.profilePhoto||'',practiceStreak:user.practiceStreak||0,longestStreak:user.longestStreak||0,lastPracticeDate:user.lastPracticeDate||'',certificates:user.certificates||[]};
  res.json({token:jwt.sign(safe,secret()),user:safe});
});

export default router;

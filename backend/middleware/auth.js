import jwt from 'jsonwebtoken';

const secret=()=>process.env.JWT_SECRET||'development-only-secret-change-me';

export const auth=(req,res,next)=>{
  try {
    const header=req.headers.authorization||'';
    if(!header.startsWith('Bearer '))return res.status(401).json({error:'Unauthorized'});
    req.user=jwt.verify(header.slice(7),secret());
    next();
  } catch(error) { return res.status(401).json({error:'Unauthorized'}); }
};

export const demoAuth=(req,res,next)=>{if(!req.headers.authorization)return next();return auth(req,res,next)};

export const requireRole=(...roles)=>(req,res,next)=>{
  if(!req.user)return res.status(401).json({error:'Unauthorized'});
  if(!roles.includes(req.user.role))return res.status(403).json({error:'You do not have permission to access this resource'});
  next();
};

export const requireMentor=requireRole('mentor','admin');

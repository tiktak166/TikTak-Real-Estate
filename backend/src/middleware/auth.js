import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
export async function authenticate(req,res,next){
  try {
    const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):null;
    if(!token) return res.status(401).json({error:'Authentication required'});
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    const user=await prisma.user.findUnique({where:{id:payload.sub},select:{id:true,fullName:true,contact:true,country:true,role:true,isActive:true}});
    if(!user||!user.isActive) return res.status(401).json({error:'Account unavailable'});
    req.user=user; next();
  } catch { return res.status(401).json({error:'Invalid or expired token'}); }
}
export const allowRoles=(...roles)=>(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({error:'Permission denied'});

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient();
try { const contact=process.env.ADMIN_CONTACT;const password=process.env.ADMIN_PASSWORD;if(!contact||!password){console.log('Set ADMIN_CONTACT and ADMIN_PASSWORD in .env before seeding admin.');process.exit(0);}const passwordHash=await bcrypt.hash(password,12);await prisma.user.upsert({where:{contact},update:{role:'ADMIN',passwordHash,isActive:true},create:{fullName:process.env.ADMIN_NAME||'TikTak Administrator',country:'Rwanda',contact,passwordHash,role:'ADMIN'}});console.log('Admin account created/updated.');} finally {await prisma.$disconnect();}

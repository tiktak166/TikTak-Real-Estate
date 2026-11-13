import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
const router=Router();router.use(authenticate,allowRoles('ADMIN'));
router.get('/overview',async(req,res,next)=>{try{const [users,listings,pending,completed,commissions]=await Promise.all([prisma.user.count(),prisma.listing.count(),prisma.listing.count({where:{status:'PENDING'}}),prisma.deal.count({where:{status:'SALE_COMPLETED'}}),prisma.commission.groupBy({by:['currency','status'],_sum:{amount:true},_count:true})]);res.json({users,listings,pendingListings:pending,completedDeals:completed,commissions});}catch(e){next(e);}});
router.get('/listings',async(req,res,next)=>{try{const listings=await prisma.listing.findMany({include:{seller:{select:{id:true,fullName:true,contact:true,country:true}}},orderBy:{createdAt:'desc'}});res.json({listings});}catch(e){next(e);}});
router.patch('/listings/:id/status',async(req,res,next)=>{try{const {z}=await import('zod');const status=z.enum(['PENDING','APPROVED','REJECTED','PAUSED','SOLD']).parse(req.body.status);const listing=await prisma.listing.update({where:{id:req.params.id},data:{status},include:{seller:{select:{id:true,fullName:true,contact:true}}}});res.json({listing});}catch(e){next(e);}});
router.patch('/users/:id/active',async(req,res,next)=>{try{const {z}=await import('zod');const isActive=z.boolean().parse(req.body.isActive);const user=await prisma.user.update({where:{id:req.params.id},data:{isActive},select:{id:true,fullName:true,contact:true,role:true,isActive:true}});res.json({user});}catch(e){next(e);}});
router.get('/users',async(req,res,next)=>{try{const users=await prisma.user.findMany({select:{id:true,fullName:true,contact:true,country:true,role:true,isActive:true,createdAt:true},orderBy:{createdAt:'desc'}});res.json({users});}catch(e){next(e);}});
router.get('/commissions',async(req,res,next)=>{try{const commissions=await prisma.commission.findMany({include:{deal:{select:{code:true,price:true,seller:{select:{fullName:true}},listing:{select:{title:true}}}}},orderBy:{createdAt:'desc'}});res.json({commissions});}catch(e){next(e);}});
router.patch('/commissions/:id/paid',async(req,res,next)=>{try{const reference=String(req.body.reference||'').trim();if(!reference)return res.status(400).json({error:'Payment reference is required after manual verification'});const commission=await prisma.commission.update({where:{id:req.params.id},data:{status:'PAID',reference,paidAt:new Date()}});res.json({commission});}catch(e){next(e);}});

router.get('/images',async(req,res,next)=>{try{
 const images=await prisma.listingImage.findMany({include:{listing:{select:{id:true,code:true,title:true,status:true,country:true}}},orderBy:{createdAt:'desc'}});
 res.json({images});
}catch(e){next(e)}});
router.delete('/images/:id',async(req,res,next)=>{try{
 const image=await prisma.listingImage.findUnique({where:{id:req.params.id}});
 if(!image)return res.status(404).json({error:'Ifoto ntibonetse.'});
 await requireCloudinary().uploader.destroy(image.publicId,{resource_type:'image'});
 await prisma.listingImage.delete({where:{id:image.id}});
 res.json({deleted:true,id:image.id});
}catch(e){next(e)}});
export default router;

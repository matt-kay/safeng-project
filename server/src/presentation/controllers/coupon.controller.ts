import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { CouponService } from '../../application/services/coupon/CouponService';
import {
  CreateCouponDto,
  RedeemCouponDto,
  UpdateCouponDto,
} from '../dtos/coupon.dto';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import type { ICouponRepository } from '../../application/ports/repositories/ICouponRepository';

@Controller('coupons')
@UseGuards(FirebaseAuthGuard)
export class CouponController {
  constructor(
    private readonly couponService: CouponService,
    @Inject('ICouponRepository') private readonly couponRepo: ICouponRepository,
  ) {}

  @Post()
  async createCoupon(@Request() req, @Body() dto: CreateCouponDto) {
    const userId = req.user.uid;
    const coupon = await this.couponService.createCoupon(
      userId,
      dto.amount_per_use,
      dto.max_uses,
      dto.currency,
      dto.name,
      dto.expires_at ? new Date(dto.expires_at) : undefined,
      dto.idempotency_key,
      dto.code,
    );

    return {
      status: 'success',
      data: coupon,
    };
  }

  @Post('redeem')
  async redeemCoupon(@Request() req, @Body() dto: RedeemCouponDto) {
    const userId = req.user.uid;
    const redemption = await this.couponService.redeemCoupon(
      userId,
      dto.code,
      dto.idempotency_key,
    );

    return {
      status: 'success',
      data: redemption,
    };
  }

  @Get()
  async listMyCoupons(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.uid;
    const p = parseInt(page || '1', 10);
    const l = parseInt(limit || '20', 10);
    const offset = (p - 1) * l;

    const coupons = await this.couponRepo.findByCreatorId(userId, l, offset);

    return {
      status: 'success',
      data: coupons,
      meta: {
        page: p,
        limit: l,
      },
    };
  }

  @Get(':id')
  async getCouponDetails(@Request() req, @Param('id') id: string) {
    const userId = req.user.uid;
    const coupon = await this.couponRepo.findById(id);

    if (!coupon || coupon.creatorUserId !== userId) {
      throw new BadRequestException('Coupon not found');
    }

    return {
      status: 'success',
      data: coupon,
    };
  }

  @Patch(':id')
  async updateCoupon(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    const userId = req.user.uid;
    const coupon = await this.couponRepo.findById(id);

    if (!coupon || coupon.creatorUserId !== userId) {
      throw new BadRequestException('Coupon not found');
    }

    if (dto.name) coupon.name = dto.name;
    if (dto.expires_at) coupon.expiresAt = new Date(dto.expires_at);

    await this.couponRepo.save(coupon);

    return {
      status: 'success',
      data: coupon,
    };
  }

  @Post(':id/pause')
  async pauseCoupon(@Request() req, @Param('id') id: string) {
    const userId = req.user.uid;
    const coupon = await this.couponService.pauseCoupon(userId, id);
    return { status: 'success', data: coupon };
  }

  @Post(':id/resume')
  async resumeCoupon(@Request() req, @Param('id') id: string) {
    const userId = req.user.uid;
    const coupon = await this.couponService.resumeCoupon(userId, id);
    return { status: 'success', data: coupon };
  }

  @Post(':id/revoke')
  async revokeCoupon(@Request() req, @Param('id') id: string) {
    const userId = req.user.uid;
    const coupon = await this.couponService.revokeCoupon(userId, id);
    return { status: 'success', data: coupon };
  }
}

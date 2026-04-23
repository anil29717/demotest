import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('deals')
  async dealsCsv(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId: string,
    @Res() res: Response,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: user.sub, organizationId },
    });
    if (!member) {
      res.status(403).send('Forbidden');
      return;
    }
    const rows = await this.prisma.deal.findMany({ where: { organizationId } });
    const header = 'id,stage,requirementId,propertyId,institutionId,createdAt\n';
    const body = rows
      .map(
        (r) =>
          `${r.id},${r.stage},${r.requirementId},${r.propertyId ?? ''},${r.institutionId ?? ''},${r.createdAt.toISOString()}`,
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="deals.csv"');
    res.send(header + body);
  }

  @Get('properties')
  async propertiesCsv(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId: string,
    @Res() res: Response,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: user.sub, organizationId },
    });
    if (!member) {
      res.status(403).send('Forbidden');
      return;
    }
    const rows = await this.prisma.property.findMany({
      where: { organizationId },
    });
    const header = 'id,title,city,dealType,price,areaSqft,status,createdAt\n';
    const body = rows
      .map(
        (r) =>
          `${r.id},${escapeCsv(r.title)},${escapeCsv(r.city)},${r.dealType},${r.price},${r.areaSqft},${r.status},${r.createdAt.toISOString()}`,
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="properties.csv"');
    res.send(header + body);
  }

  @Get('leads')
  async leads(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId: string,
    @Res() res: Response,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: user.sub, organizationId },
    });
    if (!member) {
      res.status(403).send('Forbidden');
      return;
    }
    const rows = await this.prisma.lead.findMany({ where: { organizationId } });
    const header = 'id,leadName,source,status,pipelineStage,createdAt\n';
    const body = rows
      .map(
        (r) =>
          `${r.id},${escapeCsv(r.leadName)},${r.source},${r.status},${r.pipelineStage ?? ''},${r.createdAt.toISOString()}`,
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(header + body);
  }
}

function escapeCsv(s: string) {
  if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

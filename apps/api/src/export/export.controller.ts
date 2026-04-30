import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  @Get('deals')
  async dealsCsv(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId: string | undefined,
    @Res() res: Response,
  ) {
    const resolved = await this.organizations.resolveOrganizationIdForUser(
      user.sub,
      organizationId,
    );
    if (!resolved) {
      res.status(403).send('Forbidden');
      return;
    }
    const rows = await this.prisma.deal.findMany({
      where: { organizationId: resolved },
    });
    const header =
      'id,stage,requirementId,propertyId,institutionId,createdAt\n';
    const body = rows
      .map(
        (r) =>
          [
            r.id,
            r.stage,
            r.requirementId,
            r.propertyId ?? '',
            r.institutionId ?? '',
            r.createdAt.toISOString(),
          ]
            .map(escapeCsv)
            .join(','),
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="deals.csv"');
    res.send(header + body);
  }

  @Get('properties')
  async propertiesCsv(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId: string | undefined,
    @Res() res: Response,
  ) {
    const resolved = await this.organizations.resolveOrganizationIdForUser(
      user.sub,
      organizationId,
    );
    if (!resolved) {
      res.status(403).send('Forbidden');
      return;
    }
    const rows = await this.prisma.property.findMany({
      where: { organizationId: resolved },
    });
    const header = 'id,title,city,dealType,price,areaSqft,status,createdAt\n';
    const body = rows
      .map(
        (r) =>
          [
            r.id,
            r.title,
            r.city,
            r.dealType,
            String(r.price),
            String(r.areaSqft),
            r.status,
            r.createdAt.toISOString(),
          ]
            .map(escapeCsv)
            .join(','),
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="properties.csv"',
    );
    res.send(header + body);
  }

  @Get('leads')
  async leads(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId: string | undefined,
    @Res() res: Response,
  ) {
    const resolved = await this.organizations.resolveOrganizationIdForUser(
      user.sub,
      organizationId,
    );
    if (!resolved) {
      res.status(403).send('Forbidden');
      return;
    }
    const rows = await this.prisma.lead.findMany({
      where: { organizationId: resolved },
    });
    const header = 'id,leadName,source,status,pipelineStage,createdAt\n';
    const body = rows
      .map(
        (r) =>
          [
            r.id,
            r.leadName,
            r.source,
            r.status,
            r.pipelineStage ?? '',
            r.createdAt.toISOString(),
          ]
            .map(escapeCsv)
            .join(','),
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(header + body);
  }
}

function escapeCsv(raw: string) {
  const s = String(raw ?? '');
  const neutralized =
    s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@')
      ? `'${s}`
      : s;
  if (
    neutralized.includes(',') ||
    neutralized.includes('"') ||
    neutralized.includes('\n') ||
    neutralized.includes('\r')
  ) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

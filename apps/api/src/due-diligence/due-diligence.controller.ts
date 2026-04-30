import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DdItemStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { DueDiligenceService } from './due-diligence.service';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

class ChecklistItemDto {
  @IsString()
  id!: string;

  @IsString()
  @MaxLength(300)
  label!: string;

  @IsBoolean()
  done!: boolean;
}

class SaveChecklistDto {
  @IsArray()
  items!: ChecklistItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class AssignDdItemDto {
  @IsOptional()
  @IsString()
  assigneeUserId?: string;
}

class UpdateDdItemStatusDto {
  @IsString()
  status!: 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

class AddDdEvidenceDto {
  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsString()
  kind!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** Module 21 — DD checklist per deal */
@Controller('dd')
@UseGuards(JwtAuthGuard)
export class DueDiligenceController {
  constructor(private readonly dd: DueDiligenceService) {}

  /** Property-scoped DD template (owner, broker, admin, or public active listing). */
  @Get('property/:propertyId/checklist')
  async propertyChecklist(
    @CurrentUser() user: JwtPayloadUser,
    @Param('propertyId') propertyId: string,
  ) {
    return this.dd.propertyChecklistTemplate(user.sub, user.role, propertyId);
  }

  @Get('deal/:dealId')
  async caseView(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
  ) {
    return this.dd.getDealCaseView({
      userId: user.sub,
      role: user.role,
      dealId,
    });
  }

  @Get('deal/:dealId/checklist')
  async checklist(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
  ) {
    const data = await this.dd.getDealCaseView({
      userId: user.sub,
      role: user.role,
      dealId,
    });
    return {
      dealId,
      status: data.case.status,
      requiredDone: data.case.requiredDone,
      requiredTotal: data.case.requiredTotal,
      items: data.items.map((i) => ({
        id: i.key,
        label: i.label,
        done: i.status === DdItemStatus.COMPLETED,
        status: i.status,
        assignee: i.assignee,
        notes: i.notes,
        dueAt: i.dueAt,
        evidenceCount: i.evidence.length,
      })),
    };
  }

  @Get('deal/:dealId/items')
  async listItems(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
  ) {
    return this.dd.listItems({
      userId: user.sub,
      role: user.role,
      dealId,
    });
  }

  @Post('deal/:dealId/checklist')
  async saveChecklist(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
    @Body() dto: SaveChecklistDto,
  ) {
    const cleaned = dto.items.map((i, idx) => ({
      id: String(i.id).trim(),
      label: String(i.label).trim().slice(0, 300),
      done: Boolean(i.done),
      required: true,
      notes: undefined,
      dueAt: undefined,
      order: idx + 1,
    }));
    const result = await this.dd.upsertItems(
      { userId: user.sub, role: user.role, dealId },
      cleaned,
      dto.note,
    );
    return {
      ok: true,
      dealId,
      status: result.case.status,
      items: result.items,
    };
  }

  @Post('deal/:dealId/items')
  async upsertItems(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
    @Body() dto: SaveChecklistDto,
  ) {
    const cleaned = dto.items.map((i) => ({
      id: String(i.id).trim(),
      label: String(i.label).trim().slice(0, 300),
      done: Boolean(i.done),
      required: true,
      notes: undefined,
      dueAt: undefined,
    }));
    return this.dd.upsertItems(
      { userId: user.sub, role: user.role, dealId },
      cleaned,
      dto.note,
    );
  }

  @Post('items/:itemId/assign')
  async assignItem(
    @CurrentUser() user: JwtPayloadUser,
    @Param('itemId') itemId: string,
    @Body() dto: AssignDdItemDto,
  ) {
    return this.dd.assignItem(
      { userId: user.sub, role: user.role },
      itemId,
      dto.assigneeUserId?.trim() || null,
    );
  }

  @Post('items/:itemId/status')
  async updateItemStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateDdItemStatusDto,
  ) {
    const status = dto.status.trim().toUpperCase();
    if (!(Object.values(DdItemStatus) as string[]).includes(status)) {
      throw new BadRequestException('Invalid DD item status');
    }
    return this.dd.updateItemStatus(
      { userId: user.sub, role: user.role },
      itemId,
      status as DdItemStatus,
      dto.note,
    );
  }

  @Post('items/:itemId/evidence')
  async addEvidence(
    @CurrentUser() user: JwtPayloadUser,
    @Param('itemId') itemId: string,
    @Body() dto: AddDdEvidenceDto,
  ) {
    return this.dd.attachEvidence(
      { userId: user.sub, role: user.role },
      itemId,
      {
        documentId: dto.documentId?.trim() || undefined,
        url: dto.url?.trim() || undefined,
        kind: dto.kind,
        title: dto.title,
        notes: dto.notes,
      },
    );
  }

  @Get('deal/:dealId/history')
  async caseHistory(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
  ) {
    return this.dd.listCaseHistory({
      userId: user.sub,
      role: user.role,
      dealId,
    });
  }

  @Get('deal/:dealId/checklist/history')
  async checklistHistory(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
  ) {
    const events = await this.dd.listCaseHistory({
      userId: user.sub,
      role: user.role,
      dealId,
    });
    return events.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      user: e.actor,
      metadata: e.detail,
      type: e.type,
      item: e.item,
    }));
  }
}

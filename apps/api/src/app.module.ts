import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { RequirementsModule } from './requirements/requirements.module';
import { MatchingModule } from './matching/matching.module';
import { DealsModule } from './deals/deals.module';
import { LeadsModule } from './leads/leads.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { NdasModule } from './ndas/ndas.module';
import { DocumentsModule } from './documents/documents.module';
import { ExportModule } from './export/export.module';
import { PartnersModule } from './partners/partners.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { VerticalsModule } from './verticals/verticals.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ServicesModule } from './services/services.module';
import { IrmModule } from './irm/irm.module';
import { BillingModule } from './billing/billing.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { HealthController } from './health/health.controller';
import { ComplianceModule } from './compliance/compliance.module';
import { FraudModule } from './fraud/fraud.module';
import { DueDiligenceModule } from './due-diligence/due-diligence.module';
import { Phase2Module } from './phase2/phase2.module';
import { ReputationModule } from './reputation/reputation.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReviewsModule } from './reviews/reviews.module';
import { EscrowModule } from './escrow/escrow.module';
import { ChatModule } from './chat/chat.module';
import { ApiProductModule } from './api-product/api-product.module';
import { CrawlerAdminModule } from './crawler-admin/crawler-admin.module';
import { BuilderModule } from './builder/builder.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 100 },
      { name: 'auth', ttl: 60000, limit: 10 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuditModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    PropertiesModule,
    RequirementsModule,
    MatchingModule,
    DealsModule,
    LeadsModule,
    InstitutionsModule,
    NdasModule,
    DocumentsModule,
    ExportModule,
    PartnersModule,
    WhatsappModule,
    VerticalsModule,
    SearchModule,
    NotificationsModule,
    AnalyticsModule,
    ServicesModule,
    IrmModule,
    BillingModule,
    ComplianceModule,
    FraudModule,
    DueDiligenceModule,
    Phase2Module,
    ReputationModule,
    DashboardModule,
    ReviewsModule,
    EscrowModule,
    ChatModule,
    ApiProductModule,
    CrawlerAdminModule,
    BuilderModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}

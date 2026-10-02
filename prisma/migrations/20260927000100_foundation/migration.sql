-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('DRAFT', 'GENERATING', 'VALIDATING', 'NEEDS_REVIEW', 'VALIDATED', 'READY', 'EXPORTED', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'RETRY_WAIT', 'SUCCEEDED', 'NEEDS_REVIEW', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('BOOK_GENERATION', 'PAGE_REGENERATION', 'SERIES_GENERATION', 'PREVIEW_GENERATION', 'COVER_GENERATION', 'EXPORT', 'VALIDATION');

-- CreateEnum
CREATE TYPE "PageRole" AS ENUM ('FRONT_MATTER', 'ACTIVITY', 'ANSWER', 'BACK_MATTER');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('MANUAL_ESTIMATE', 'AI_ESTIMATE', 'REAL_MARKET_DATA');

-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('WORD', 'VOCABULARY', 'QUESTION', 'CLUE', 'PROMPT', 'QUOTE');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "FingerprintKind" AS ENUM ('PAGE', 'PUZZLE', 'WORD_SET', 'QUESTION', 'BOOK');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(160),
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "passwordHash" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" VARCHAR(40) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookType" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "pluginVersion" VARCHAR(40) NOT NULL,
    "configurationSchema" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BookType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuzzleType" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "engineVersion" VARCHAR(40) NOT NULL,

    CONSTRAINT "PuzzleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtheme" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "themeId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,

    CONSTRAINT "Subtheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audience" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "settings" JSONB NOT NULL,

    CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Niche" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "keyword" VARCHAR(300) NOT NULL,
    "mainNiche" VARCHAR(160) NOT NULL,
    "subNiche" VARCHAR(160),
    "audience" VARCHAR(160) NOT NULL,
    "ageGroup" VARCHAR(80),
    "format" VARCHAR(80) NOT NULL,
    "difficulty" VARCHAR(40) NOT NULL,
    "seasonality" VARCHAR(160),
    "language" VARCHAR(35) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Niche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NicheResearch" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "nicheId" UUID NOT NULL,
    "source" "EvidenceSource" NOT NULL,
    "sourceUrl" TEXT,
    "observedAt" TIMESTAMPTZ(3) NOT NULL,
    "demand" INTEGER NOT NULL,
    "competition" INTEGER NOT NULL,
    "specificity" INTEGER NOT NULL,
    "evergreen" INTEGER NOT NULL,
    "commercialIntent" INTEGER NOT NULL,
    "audienceFit" INTEGER NOT NULL,
    "scalability" INTEGER NOT NULL,
    "seriesPotential" INTEGER NOT NULL,
    "opportunityScore" INTEGER NOT NULL,
    "scoringVersion" VARCHAR(40) NOT NULL,
    "evidence" JSONB NOT NULL,

    CONSTRAINT "NicheResearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "text" TEXT NOT NULL,
    "canonicalHash" CHAR(64) NOT NULL,
    "themeId" UUID,
    "subthemeId" UUID,
    "language" VARCHAR(35) NOT NULL,
    "difficulty" VARCHAR(40) NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "source" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "contentItemId" UUID NOT NULL,
    "normalized" VARCHAR(160) NOT NULL,
    "length" INTEGER NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("contentItemId")
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "contentItemId" UUID NOT NULL,
    "sourceLanguage" VARCHAR(35) NOT NULL,
    "targetLanguage" VARCHAR(35) NOT NULL,
    "translation" TEXT NOT NULL,
    "level" VARCHAR(40) NOT NULL,
    "pronunciation" TEXT,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("contentItemId")
);

-- CreateTable
CREATE TABLE "Question" (
    "contentItemId" UUID NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "wrongAnswers" TEXT[],
    "explanation" TEXT,
    "sourceRequired" BOOLEAN NOT NULL DEFAULT true,
    "confidence" DECIMAL(5,4),
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("contentItemId")
);

-- CreateTable
CREATE TABLE "Clue" (
    "contentItemId" UUID NOT NULL,
    "answer" VARCHAR(160) NOT NULL,

    CONSTRAINT "Clue_pkey" PRIMARY KEY ("contentItemId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCategory" (
    "contentItemId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "ContentCategory_pkey" PRIMARY KEY ("contentItemId","categoryId")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "subtitle" VARCHAR(400),
    "slug" VARCHAR(260) NOT NULL,
    "bookTypeId" UUID NOT NULL,
    "themeId" UUID,
    "subthemeId" UUID,
    "audienceId" UUID,
    "seriesId" UUID,
    "seriesOrder" INTEGER,
    "language" VARCHAR(35) NOT NULL,
    "difficulty" VARCHAR(40) NOT NULL,
    "trimWidth" DECIMAL(5,2) NOT NULL,
    "trimHeight" DECIMAL(5,2) NOT NULL,
    "requestedActivityPages" INTEGER NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "interiorType" VARCHAR(30) NOT NULL,
    "typography" VARCHAR(30) NOT NULL,
    "generationSeed" VARCHAR(128) NOT NULL,
    "uniquenessScore" INTEGER,
    "status" "BookStatus" NOT NULL DEFAULT 'DRAFT',
    "currentRevision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookRevision" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "configuration" JSONB NOT NULL,
    "generationManifest" JSONB NOT NULL,
    "metadata" JSONB,
    "fingerprint" CHAR(64),
    "sealedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puzzle" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "puzzleTypeId" UUID NOT NULL,
    "engineVersion" VARCHAR(40) NOT NULL,
    "seed" VARCHAR(128) NOT NULL,
    "configuration" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "solution" JSONB NOT NULL,
    "puzzleHash" CHAR(64) NOT NULL,
    "wordSetHash" CHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookPage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "role" "PageRole" NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "instructions" TEXT,
    "seed" VARCHAR(128) NOT NULL,
    "puzzleId" UUID,
    "answerForId" UUID,
    "content" JSONB NOT NULL,
    "layoutSnapshot" JSONB NOT NULL,
    "semanticHash" CHAR(64) NOT NULL,
    "layoutHash" CHAR(64) NOT NULL,

    CONSTRAINT "BookPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentUsage" (
    "userId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "contentItemId" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "ContentUsage_pkey" PRIMARY KEY ("pageId","contentItemId")
);

-- CreateTable
CREATE TABLE "ContentFingerprint" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "originRevisionId" UUID NOT NULL,
    "kind" "FingerprintKind" NOT NULL,
    "canonicalizerVersion" VARCHAR(40) NOT NULL,
    "hash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityPolicy" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "version" INTEGER NOT NULL,
    "configuration" JSONB NOT NULL,

    CONSTRAINT "QualityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationRun" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "policySnapshot" JSONB NOT NULL,
    "validatorVersion" VARCHAR(40) NOT NULL,
    "checkedPages" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ValidationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationResult" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "rule" VARCHAR(100) NOT NULL,
    "severity" "Severity" NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "pageNumber" INTEGER,
    "message" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "ValidationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniquenessReport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "score" INTEGER,
    "passed" BOOLEAN NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "algorithmVersion" VARCHAR(40) NOT NULL,
    "comparedThrough" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UniquenessReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookApproval" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "approvedById" UUID NOT NULL,
    "approvedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookTemplate" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "version" INTEGER NOT NULL,
    "configuration" JSONB NOT NULL,
    "supportedTypes" TEXT[],

    CONSTRAINT "BookTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverTemplate" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "version" INTEGER NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "configuration" JSONB NOT NULL,
    "previewImage" TEXT,
    "supportedSizes" JSONB NOT NULL,

    CONSTRAINT "CoverTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverDesign" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "side" VARCHAR(20) NOT NULL,
    "templateSnapshot" JSONB NOT NULL,
    "configuration" JSONB NOT NULL,
    "assetId" UUID,

    CONSTRAINT "CoverDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookSeries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "description" TEXT,
    "branding" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleBook" (
    "userId" UUID NOT NULL,
    "bundleId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "BundleBook_pkey" PRIMARY KEY ("bundleId","bookId")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "mediaType" VARCHAR(100) NOT NULL,
    "byteSize" BIGINT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "source" TEXT,
    "license" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Export" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "format" VARCHAR(40) NOT NULL,
    "isReviewCopy" BOOLEAN NOT NULL DEFAULT true,
    "renderVersion" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bookId" UUID,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "payload" JSONB NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" VARCHAR(100),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" UUID,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "startedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "errorCode" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationStep" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "key" VARCHAR(160) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "checkpoint" JSONB,
    "outputHash" CHAR(64),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "GenerationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" BIGSERIAL NOT NULL,
    "jobId" UUID NOT NULL,
    "level" "Severity" NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProvider" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "secretRef" VARCHAR(160),
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AIProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "modelKey" VARCHAR(160) NOT NULL,
    "capabilities" JSONB NOT NULL,
    "pricing" JSONB,
    "priceObservedAt" TIMESTAMPTZ(3),

    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "version" INTEGER NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT NOT NULL,
    "providerKey" VARCHAR(80),
    "model" VARCHAR(160),
    "temperature" DECIMAL(3,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "outputSchema" JSONB NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "model" VARCHAR(160) NOT NULL,
    "requestId" VARCHAR(200),
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCost" DECIMAL(14,8),
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "priceSnapshot" JSONB,
    "succeeded" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_provider_providerAccountId_key" ON "AuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "VerificationToken_expiresAt_idx" ON "VerificationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookType_key_key" ON "BookType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PuzzleType_key_key" ON "PuzzleType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_userId_id_key" ON "Theme"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_userId_slug_key" ON "Theme"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subtheme_userId_themeId_id_key" ON "Subtheme"("userId", "themeId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Subtheme_themeId_slug_key" ON "Subtheme"("themeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Audience_userId_id_key" ON "Audience"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Audience_userId_name_key" ON "Audience"("userId", "name");

-- CreateIndex
CREATE INDEX "Niche_userId_createdAt_id_idx" ON "Niche"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Niche_userId_id_key" ON "Niche"("userId", "id");

-- CreateIndex
CREATE INDEX "NicheResearch_userId_nicheId_observedAt_idx" ON "NicheResearch"("userId", "nicheId", "observedAt");

-- CreateIndex
CREATE INDEX "ContentItem_userId_kind_language_approved_idx" ON "ContentItem"("userId", "kind", "language", "approved");

-- CreateIndex
CREATE INDEX "ContentItem_userId_themeId_subthemeId_idx" ON "ContentItem"("userId", "themeId", "subthemeId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_userId_id_key" ON "ContentItem"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_userId_kind_language_canonicalHash_key" ON "ContentItem"("userId", "kind", "language", "canonicalHash");

-- CreateIndex
CREATE UNIQUE INDEX "Category_key_key" ON "Category"("key");

-- CreateIndex
CREATE INDEX "Book_userId_status_createdAt_id_idx" ON "Book"("userId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Book_userId_bookTypeId_createdAt_idx" ON "Book"("userId", "bookTypeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Book_userId_id_key" ON "Book"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Book_userId_slug_key" ON "Book"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Book_seriesId_seriesOrder_key" ON "Book"("seriesId", "seriesOrder");

-- CreateIndex
CREATE INDEX "BookRevision_userId_fingerprint_idx" ON "BookRevision"("userId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "BookRevision_userId_id_key" ON "BookRevision"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "BookRevision_bookId_number_key" ON "BookRevision"("bookId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Puzzle_userId_revisionId_id_key" ON "Puzzle"("userId", "revisionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Puzzle_revisionId_puzzleHash_key" ON "Puzzle"("revisionId", "puzzleHash");

-- CreateIndex
CREATE UNIQUE INDEX "Puzzle_revisionId_wordSetHash_key" ON "Puzzle"("revisionId", "wordSetHash");

-- CreateIndex
CREATE UNIQUE INDEX "BookPage_answerForId_key" ON "BookPage"("answerForId");

-- CreateIndex
CREATE UNIQUE INDEX "BookPage_userId_revisionId_id_key" ON "BookPage"("userId", "revisionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "BookPage_revisionId_pageNumber_key" ON "BookPage"("revisionId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BookPage_userId_revisionId_answerForId_key" ON "BookPage"("userId", "revisionId", "answerForId");

-- CreateIndex
CREATE UNIQUE INDEX "BookPage_revisionId_semanticHash_key" ON "BookPage"("revisionId", "semanticHash");

-- CreateIndex
CREATE INDEX "ContentUsage_userId_contentItemId_idx" ON "ContentUsage"("userId", "contentItemId");

-- CreateIndex
CREATE INDEX "ContentFingerprint_originRevisionId_idx" ON "ContentFingerprint"("originRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentFingerprint_userId_kind_canonicalizerVersion_hash_key" ON "ContentFingerprint"("userId", "kind", "canonicalizerVersion", "hash");

-- CreateIndex
CREATE UNIQUE INDEX "QualityPolicy_userId_name_version_key" ON "QualityPolicy"("userId", "name", "version");

-- CreateIndex
CREATE INDEX "ValidationRun_revisionId_startedAt_idx" ON "ValidationRun"("revisionId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationRun_userId_revisionId_id_key" ON "ValidationRun"("userId", "revisionId", "id");

-- CreateIndex
CREATE INDEX "ValidationResult_runId_severity_passed_idx" ON "ValidationResult"("runId", "severity", "passed");

-- CreateIndex
CREATE INDEX "UniquenessReport_revisionId_createdAt_idx" ON "UniquenessReport"("revisionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookApproval_revisionId_key" ON "BookApproval"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "BookApproval_userId_revisionId_key" ON "BookApproval"("userId", "revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "BookTemplate_userId_name_version_key" ON "BookTemplate"("userId", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CoverTemplate_userId_name_version_key" ON "CoverTemplate"("userId", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CoverDesign_revisionId_side_key" ON "CoverDesign"("revisionId", "side");

-- CreateIndex
CREATE UNIQUE INDEX "BookSeries_userId_id_key" ON "BookSeries"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_userId_id_key" ON "Bundle"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "BundleBook_bundleId_position_key" ON "BundleBook"("bundleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_userId_createdAt_id_idx" ON "Asset"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_userId_id_key" ON "Asset"("userId", "id");

-- CreateIndex
CREATE INDEX "Export_userId_createdAt_id_idx" ON "Export"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "GenerationJob_status_availableAt_createdAt_idx" ON "GenerationJob"("status", "availableAt", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_status_leaseExpiresAt_idx" ON "GenerationJob"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "GenerationJob_userId_createdAt_id_idx" ON "GenerationJob"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_userId_id_key" ON "GenerationJob"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_userId_idempotencyKey_key" ON "GenerationJob"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationStep_jobId_key_key" ON "GenerationStep"("jobId", "key");

-- CreateIndex
CREATE INDEX "GenerationLog_jobId_createdAt_idx" ON "GenerationLog"("jobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIProvider_userId_id_key" ON "AIProvider"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AIProvider_userId_key_key" ON "AIProvider"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_providerId_modelKey_key" ON "AIModel"("providerId", "modelKey");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_userId_name_version_key" ON "PromptTemplate"("userId", "name", "version");

-- CreateIndex
CREATE INDEX "AIUsage_userId_createdAt_idx" ON "AIUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsage_jobId_idx" ON "AIUsage"("jobId");

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtheme" ADD CONSTRAINT "Subtheme_userId_themeId_fkey" FOREIGN KEY ("userId", "themeId") REFERENCES "Theme"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audience" ADD CONSTRAINT "Audience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Niche" ADD CONSTRAINT "Niche_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NicheResearch" ADD CONSTRAINT "NicheResearch_userId_nicheId_fkey" FOREIGN KEY ("userId", "nicheId") REFERENCES "Niche"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_userId_themeId_fkey" FOREIGN KEY ("userId", "themeId") REFERENCES "Theme"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_userId_themeId_subthemeId_fkey" FOREIGN KEY ("userId", "themeId", "subthemeId") REFERENCES "Subtheme"("userId", "themeId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clue" ADD CONSTRAINT "Clue_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCategory" ADD CONSTRAINT "ContentCategory_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCategory" ADD CONSTRAINT "ContentCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_bookTypeId_fkey" FOREIGN KEY ("bookTypeId") REFERENCES "BookType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_userId_themeId_fkey" FOREIGN KEY ("userId", "themeId") REFERENCES "Theme"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_userId_themeId_subthemeId_fkey" FOREIGN KEY ("userId", "themeId", "subthemeId") REFERENCES "Subtheme"("userId", "themeId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_userId_audienceId_fkey" FOREIGN KEY ("userId", "audienceId") REFERENCES "Audience"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_userId_seriesId_fkey" FOREIGN KEY ("userId", "seriesId") REFERENCES "BookSeries"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookRevision" ADD CONSTRAINT "BookRevision_userId_bookId_fkey" FOREIGN KEY ("userId", "bookId") REFERENCES "Book"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_userId_revisionId_fkey" FOREIGN KEY ("userId", "revisionId") REFERENCES "BookRevision"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_puzzleTypeId_fkey" FOREIGN KEY ("puzzleTypeId") REFERENCES "PuzzleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookPage" ADD CONSTRAINT "BookPage_userId_revisionId_fkey" FOREIGN KEY ("userId", "revisionId") REFERENCES "BookRevision"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookPage" ADD CONSTRAINT "BookPage_userId_revisionId_puzzleId_fkey" FOREIGN KEY ("userId", "revisionId", "puzzleId") REFERENCES "Puzzle"("userId", "revisionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookPage" ADD CONSTRAINT "BookPage_userId_revisionId_answerForId_fkey" FOREIGN KEY ("userId", "revisionId", "answerForId") REFERENCES "BookPage"("userId", "revisionId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ContentUsage" ADD CONSTRAINT "ContentUsage_userId_revisionId_pageId_fkey" FOREIGN KEY ("userId", "revisionId", "pageId") REFERENCES "BookPage"("userId", "revisionId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentUsage" ADD CONSTRAINT "ContentUsage_userId_contentItemId_fkey" FOREIGN KEY ("userId", "contentItemId") REFERENCES "ContentItem"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFingerprint" ADD CONSTRAINT "ContentFingerprint_userId_originRevisionId_fkey" FOREIGN KEY ("userId", "originRevisionId") REFERENCES "BookRevision"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityPolicy" ADD CONSTRAINT "QualityPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationRun" ADD CONSTRAINT "ValidationRun_userId_revisionId_fkey" FOREIGN KEY ("userId", "revisionId") REFERENCES "BookRevision"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationResult" ADD CONSTRAINT "ValidationResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniquenessReport" ADD CONSTRAINT "UniquenessReport_userId_revisionId_fkey" FOREIGN KEY ("userId", "revisionId") REFERENCES "BookRevision"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookApproval" ADD CONSTRAINT "BookApproval_userId_revisionId_fkey" FOREIGN KEY ("userId", "revisionId") REFERENCES "BookRevision"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookApproval" ADD CONSTRAINT "BookApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookTemplate" ADD CONSTRAINT "BookTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverTemplate" ADD CONSTRAINT "CoverTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverDesign" ADD CONSTRAINT "CoverDesign_userId_revisionId_fkey" FOREIGN KEY ("userId", "revisionId") REFERENCES "BookRevision"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverDesign" ADD CONSTRAINT "CoverDesign_userId_assetId_fkey" FOREIGN KEY ("userId", "assetId") REFERENCES "Asset"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookSeries" ADD CONSTRAINT "BookSeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleBook" ADD CONSTRAINT "BundleBook_userId_bundleId_fkey" FOREIGN KEY ("userId", "bundleId") REFERENCES "Bundle"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleBook" ADD CONSTRAINT "BundleBook_userId_bookId_fkey" FOREIGN KEY ("userId", "bookId") REFERENCES "Book"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_userId_revisionId_fkey" FOREIGN KEY ("userId", "revisionId") REFERENCES "BookRevision"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_userId_assetId_fkey" FOREIGN KEY ("userId", "assetId") REFERENCES "Asset"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_userId_bookId_fkey" FOREIGN KEY ("userId", "bookId") REFERENCES "Book"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationStep" ADD CONSTRAINT "GenerationStep_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationLog" ADD CONSTRAINT "GenerationLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProvider" ADD CONSTRAINT "AIProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIModel" ADD CONSTRAINT "AIModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_jobId_fkey" FOREIGN KEY ("userId", "jobId") REFERENCES "GenerationJob"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

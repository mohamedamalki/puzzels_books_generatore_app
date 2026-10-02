-- Prisma cannot express CHECK constraints. Keep these in reviewed migrations.
ALTER TABLE "User" ADD CONSTRAINT "User_email_normalized" CHECK ("email" = lower(btrim("email")) AND length("email") > 3);
ALTER TABLE "Audience" ADD CONSTRAINT "Audience_age_range" CHECK (("minAge" IS NULL OR "minAge" >= 0) AND ("maxAge" IS NULL OR "maxAge" >= 0) AND ("minAge" IS NULL OR "maxAge" IS NULL OR "minAge" <= "maxAge"));
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_quality_range" CHECK ("qualityScore" IS NULL OR "qualityScore" BETWEEN 0 AND 100);
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_usage_nonnegative" CHECK ("usageCount" >= 0);
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_subtheme_requires_theme" CHECK ("subthemeId" IS NULL OR "themeId" IS NOT NULL);
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_age_range" CHECK (("minAge" IS NULL OR "minAge" >= 0) AND ("maxAge" IS NULL OR "maxAge" >= 0) AND ("minAge" IS NULL OR "maxAge" IS NULL OR "minAge" <= "maxAge"));
ALTER TABLE "Word" ADD CONSTRAINT "Word_positive_length" CHECK ("length" > 0 AND "length" = char_length("normalized"));
ALTER TABLE "Question" ADD CONSTRAINT "Question_confidence_range" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 1);
ALTER TABLE "Book" ADD CONSTRAINT "Book_size_range" CHECK ("trimWidth" BETWEEN 4 AND 12 AND "trimHeight" BETWEEN 4 AND 14);
ALTER TABLE "Book" ADD CONSTRAINT "Book_page_counts" CHECK ("requestedActivityPages" BETWEEN 1 AND 500 AND "pageCount" >= 0 AND "currentRevision" >= 1);
ALTER TABLE "Book" ADD CONSTRAINT "Book_uniqueness_range" CHECK ("uniquenessScore" IS NULL OR "uniquenessScore" BETWEEN 0 AND 100);
ALTER TABLE "Book" ADD CONSTRAINT "Book_subtheme_requires_theme" CHECK ("subthemeId" IS NULL OR "themeId" IS NOT NULL);
ALTER TABLE "Book" ADD CONSTRAINT "Book_series_pair" CHECK (("seriesId" IS NULL AND "seriesOrder" IS NULL) OR ("seriesId" IS NOT NULL AND "seriesOrder" IS NOT NULL AND "seriesOrder" > 0));
ALTER TABLE "BookRevision" ADD CONSTRAINT "BookRevision_positive_number" CHECK ("number" > 0);
ALTER TABLE "BookPage" ADD CONSTRAINT "BookPage_positive_number" CHECK ("pageNumber" > 0);
ALTER TABLE "BookPage" ADD CONSTRAINT "BookPage_answer_link" CHECK (("answerForId" IS NULL OR "role" = 'ANSWER') AND ("answerForId" IS NULL OR "answerForId" <> "id"));
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_ranges" CHECK ("progress" BETWEEN 0 AND 100 AND "maxAttempts" BETWEEN 1 AND 10 AND "attempts" BETWEEN 0 AND "maxAttempts");
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_lease_pair" CHECK (("status" = 'RUNNING' AND "leaseToken" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL) OR ("status" <> 'RUNNING' AND "leaseToken" IS NULL AND "leaseExpiresAt" IS NULL));
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_completion" CHECK ("status" <> 'SUCCEEDED' OR ("progress" = 100 AND "finishedAt" IS NOT NULL));
ALTER TABLE "GenerationStep" ADD CONSTRAINT "GenerationStep_attempts" CHECK ("attempts" >= 0);
ALTER TABLE "ValidationRun" ADD CONSTRAINT "ValidationRun_pages" CHECK ("checkedPages" >= 0);
ALTER TABLE "UniquenessReport" ADD CONSTRAINT "UniquenessReport_score" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);
ALTER TABLE "UniquenessReport" ADD CONSTRAINT "UniquenessReport_pass_requires_score" CHECK (NOT "passed" OR "score" IS NOT NULL);
ALTER TABLE "BookApproval" ADD CONSTRAINT "BookApproval_owner_approves" CHECK ("userId" = "approvedById");
ALTER TABLE "BundleBook" ADD CONSTRAINT "BundleBook_positive_position" CHECK ("position" > 0);
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_size" CHECK ("byteSize" >= 0 AND ("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0));
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_nonnegative" CHECK (("inputTokens" IS NULL OR "inputTokens" >= 0) AND ("outputTokens" IS NULL OR "outputTokens" >= 0) AND ("estimatedCost" IS NULL OR "estimatedCost" >= 0));
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_parameters" CHECK ("temperature" BETWEEN 0 AND 2 AND "version" > 0);
ALTER TABLE "BookTemplate" ADD CONSTRAINT "BookTemplate_version" CHECK ("version" > 0);
ALTER TABLE "CoverTemplate" ADD CONSTRAINT "CoverTemplate_version" CHECK ("version" > 0);
ALTER TABLE "QualityPolicy" ADD CONSTRAINT "QualityPolicy_version" CHECK ("version" > 0);
ALTER TABLE "NicheResearch" ADD CONSTRAINT "NicheResearch_scores" CHECK (
  "demand" BETWEEN 0 AND 100 AND "competition" BETWEEN 0 AND 100 AND "specificity" BETWEEN 0 AND 100
  AND "evergreen" BETWEEN 0 AND 100 AND "commercialIntent" BETWEEN 0 AND 100 AND "audienceFit" BETWEEN 0 AND 100
  AND "scalability" BETWEEN 0 AND 100 AND "seriesPotential" BETWEEN 0 AND 100 AND "opportunityScore" BETWEEN 0 AND 100
);
ALTER TABLE "NicheResearch" ADD CONSTRAINT "NicheResearch_real_source" CHECK ("source" <> 'REAL_MARKET_DATA' OR ("sourceUrl" IS NOT NULL AND length(btrim("sourceUrl")) > 0));
CREATE UNIQUE INDEX "PromptTemplate_one_active_version" ON "PromptTemplate" ("userId", "name") WHERE "active" = true;

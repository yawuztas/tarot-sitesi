-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "name" TEXT,
    "image" TEXT,
    "displayName" TEXT,
    "preferredStyleId" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'tr',
    "theme" TEXT NOT NULL DEFAULT 'mystic-dark',
    "creditsBalance" INTEGER NOT NULL DEFAULT 1,
    "freeReadingsUsed" INTEGER NOT NULL DEFAULT 0,
    "totalReadingsCount" INTEGER NOT NULL DEFAULT 0,
    "astroModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "birthDate" DATETIME,
    "birthTime" TEXT,
    "birthTimeUnknown" BOOLEAN NOT NULL DEFAULT true,
    "birthPlaceName" TEXT,
    "birthLat" REAL,
    "birthLng" REAL,
    "natalChartJson" TEXT,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_preferredStyleId_fkey" FOREIGN KEY ("preferredStyleId") REFERENCES "TarotStyle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dailyCardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyCardTime" TEXT NOT NULL DEFAULT '09:00',
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "hapticsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cardRevealSpeed" TEXT NOT NULL DEFAULT 'normal',
    "shareReadingDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TarotStyle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "description" TEXT,
    "descriptionTr" TEXT,
    "imageTheme" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "styleId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "arcanaType" TEXT NOT NULL,
    "suit" TEXT,
    "number" INTEGER NOT NULL,
    "keywordsUpright" TEXT NOT NULL,
    "keywordsReversed" TEXT NOT NULL,
    "meaningsUpright" TEXT NOT NULL,
    "meaningsReversed" TEXT NOT NULL,
    "astrologicalCorrespondence" TEXT,
    "element" TEXT,
    "numerologyKey" TEXT,
    "imageUrlThumb" TEXT,
    "imageUrlSmall" TEXT,
    "imageUrlMedium" TEXT,
    "imageUrlLarge" TEXT,
    "imageUrlFull" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Card_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "TarotStyle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Spread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "description" TEXT,
    "descriptionTr" TEXT,
    "cardCount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SpreadPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spreadId" TEXT NOT NULL,
    "positionIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "labelTr" TEXT NOT NULL,
    "meaning" TEXT,
    "meaningTr" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SpreadPosition_spreadId_fkey" FOREIGN KEY ("spreadId") REFERENCES "Spread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntentionCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "description" TEXT,
    "descriptionTr" TEXT,
    "promptModifierTr" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "spreadId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "intentionCategoryId" TEXT,
    "intentionText" TEXT,
    "drawnAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rngSeed" TEXT NOT NULL,
    "rngHash" TEXT NOT NULL,
    "astroContextJson" TEXT,
    "previousReadingsContext" TEXT,
    "aiInterpretation" TEXT,
    "aiModelUsed" TEXT,
    "aiCached" BOOLEAN NOT NULL DEFAULT false,
    "aiInputTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "aiSummaryTr" TEXT,
    "keyThemes" TEXT,
    "predictedArc" TEXT,
    "userMoodNote" TEXT,
    "userFollowupNote" TEXT,
    "followupAt" DATETIME,
    "creditTransactionId" TEXT,
    "isFreeReading" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reading_spreadId_fkey" FOREIGN KEY ("spreadId") REFERENCES "Spread" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reading_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "TarotStyle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reading_intentionCategoryId_fkey" FOREIGN KEY ("intentionCategoryId") REFERENCES "IntentionCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "readingId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "positionIndex" INTEGER NOT NULL,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "drawOrder" INTEGER NOT NULL,
    CONSTRAINT "ReadingCard_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "drawnAtDate" DATETIME NOT NULL,
    "reflectedAt" DATETIME,
    "reflectionNote" TEXT,
    "moodTag" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "creditAmount" INTEGER NOT NULL,
    "priceTl" REAL NOT NULL,
    "discountPercentage" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "badge" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "amountTl" REAL NOT NULL,
    "creditsPurchased" INTEGER NOT NULL,
    "iyzipicoPaymentId" TEXT,
    "iyzipicoConversationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawResponse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CreditPackage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "paymentId" TEXT,
    "readingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CreditTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterpretationCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "responsePayload" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AstroTransitsCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheDate" DATETIME NOT NULL,
    "transitJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AiCallLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "readingId" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AnonymousSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cookieId" TEXT NOT NULL,
    "displayName" TEXT,
    "birthDate" DATETIME,
    "birthTime" TEXT,
    "birthTimeUnknown" BOOLEAN NOT NULL DEFAULT true,
    "birthPlaceName" TEXT,
    "birthLat" REAL,
    "birthLng" REAL,
    "natalChartJson" TEXT,
    "spreadSlug" TEXT,
    "drawnCardsJson" TEXT,
    "rngSeed" TEXT,
    "rngHash" TEXT,
    "teaserText" TEXT,
    "paymentId" TEXT,
    "paidAt" DATETIME,
    "questionQuota" INTEGER NOT NULL DEFAULT 0,
    "questionsUsed" INTEGER NOT NULL DEFAULT 0,
    "consentSaveData" BOOLEAN NOT NULL DEFAULT false,
    "consentMarketing" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "finalizedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "questionNumber" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AnonymousSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "anonymousSessionId" TEXT,
    "userId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'iyzico',
    "providerPaymentId" TEXT,
    "providerToken" TEXT,
    "description" TEXT NOT NULL DEFAULT 'Mistik Tarot - 10 Soru Fal Hakkı',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserConsent" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "anonymousSessionId" TEXT,
    "saveData" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmail" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserIdentityChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "expectedAnswer" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AstroNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "affectedSign" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT,
    "sentAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "TarotStyle_slug_key" ON "TarotStyle"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Card_styleId_slug_key" ON "Card"("styleId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Spread_slug_key" ON "Spread"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SpreadPosition_spreadId_positionIndex_key" ON "SpreadPosition"("spreadId", "positionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "IntentionCategory_slug_key" ON "IntentionCategory"("slug");

-- CreateIndex
CREATE INDEX "Reading_userId_drawnAt_idx" ON "Reading"("userId", "drawnAt");

-- CreateIndex
CREATE INDEX "Reading_styleId_idx" ON "Reading"("styleId");

-- CreateIndex
CREATE INDEX "ReadingCard_readingId_idx" ON "ReadingCard"("readingId");

-- CreateIndex
CREATE INDEX "ReadingCard_cardId_idx" ON "ReadingCard"("cardId");

-- CreateIndex
CREATE INDEX "DailyCard_userId_drawnAtDate_idx" ON "DailyCard"("userId", "drawnAtDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCard_userId_drawnAtDate_key" ON "DailyCard"("userId", "drawnAtDate");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InterpretationCache_cacheKey_key" ON "InterpretationCache"("cacheKey");

-- CreateIndex
CREATE INDEX "InterpretationCache_cacheKey_expiresAt_idx" ON "InterpretationCache"("cacheKey", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AstroTransitsCache_cacheDate_key" ON "AstroTransitsCache"("cacheDate");

-- CreateIndex
CREATE INDEX "AstroTransitsCache_cacheDate_idx" ON "AstroTransitsCache"("cacheDate");

-- CreateIndex
CREATE INDEX "AiCallLog_userId_createdAt_idx" ON "AiCallLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiCallLog_createdAt_idx" ON "AiCallLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousSession_cookieId_key" ON "AnonymousSession"("cookieId");

-- CreateIndex
CREATE INDEX "AnonymousSession_cookieId_idx" ON "AnonymousSession"("cookieId");

-- CreateIndex
CREATE INDEX "AnonymousSession_userId_idx" ON "AnonymousSession"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentSession_anonymousSessionId_idx" ON "PaymentSession"("anonymousSessionId");

-- CreateIndex
CREATE INDEX "PaymentSession_userId_idx" ON "PaymentSession"("userId");

-- CreateIndex
CREATE INDEX "UserIdentityChallenge_email_idx" ON "UserIdentityChallenge"("email");

-- CreateIndex
CREATE INDEX "UserIdentityChallenge_userId_idx" ON "UserIdentityChallenge"("userId");

-- CreateIndex
CREATE INDEX "AstroNotification_userId_status_idx" ON "AstroNotification"("userId", "status");

-- CreateIndex
CREATE INDEX "AstroNotification_eventDate_idx" ON "AstroNotification"("eventDate");

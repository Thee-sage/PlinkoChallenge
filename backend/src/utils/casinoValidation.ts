import { ICasinoDocument, ITermsAndConditions } from '../models/Casino';

// Ensure numeric values
export const ensureNumericValue = (value: any, defaultValue: number = 0): number => {
    const parsed = Number(value);
    return !isNaN(parsed) && parsed >= 0 ? parsed : defaultValue;
};

// Clean array data
export const cleanArrayData = (data: any[] | string | undefined | null): any[] => {
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
            return [];
        }
    }
    
    if (Array.isArray(data)) {
        return data.filter(Boolean);
    }
    
    return [];
};
const cleanPaymentMethods = (data: any): any[] => {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch {
            return [];
        }
    }
    if (Array.isArray(data)) {
        return data.map(method => ({
            name: method.name || '',
            processingTime: method.processingTime || '',
            minDeposit: Number(method.minDeposit) || 0,
            maxWithdrawal: Number(method.maxWithdrawal) || 0,
            fees: method.fees || ''
        }));
    }
    return [];
};

export const processCasinoUpdateData = (newData: any, existingCasino: ICasinoDocument) => {
    // Process payout ratio
    const payoutRatio = {
        percentage: ensureNumericValue(
            newData.payoutRatio?.percentage,
            existingCasino.payoutRatio.percentage
        ),
        lastUpdated: new Date()
    };

    // Process payout speed
    const payoutSpeed = {
        averageDays: newData.payoutSpeed?.averageDays || existingCasino.payoutSpeed.averageDays,
        details: newData.payoutSpeed?.details || existingCasino.payoutSpeed.details
    };

    // Handle categoryRatings
    let categoryRatings = [];
    try {
        if (typeof newData.categoryRatings === 'string') {
            categoryRatings = JSON.parse(newData.categoryRatings);
        } else if (Array.isArray(newData.categoryRatings)) {
            categoryRatings = newData.categoryRatings;
        } else {
            categoryRatings = existingCasino.categoryRatings;
        }
    } catch {
        categoryRatings = existingCasino.categoryRatings;
    }

    // Handle contentSections
    let contentSections = [];
    try {
        if (typeof newData.contentSections === 'string') {
            contentSections = JSON.parse(newData.contentSections);
        } else if (Array.isArray(newData.contentSections)) {
            contentSections = newData.contentSections;
        } else {
            contentSections = existingCasino.contentSections;
        }
    } catch {
        contentSections = existingCasino.contentSections;
    }

    // Handle termsAndConditions
    let termsAndConditions: ITermsAndConditions = {
        firstDepositBonus: {
            minDeposit: 0,
            maxCashout: 0,
            excludedPaymentMethods: [],
            wageringRequirement: 0,
            bonusExpirationDays: 0,
            processingSpeed: "Instant",
            freeSpinsConditions: {
                wageringRequirement: 0,
                maxCashout: 0,
                expirationDays: 0
            },
            bonusPercentage: 0,
            claimTimeLimit: 0,
            currencies: []
        },
        generalTerms: [],
        eligibilityRequirements: [],
        restrictedCountries: [],
        additionalNotes: []
    };

    try {
        if (typeof newData.termsAndConditions === 'string') {
            const parsed = JSON.parse(newData.termsAndConditions);
            termsAndConditions = {
                ...termsAndConditions,
                ...parsed
            };
        } else if (typeof newData.termsAndConditions === 'object' && newData.termsAndConditions) {
            termsAndConditions = {
                ...termsAndConditions,
                ...newData.termsAndConditions
            };
        } else {
            termsAndConditions = existingCasino.termsAndConditions;
        }
    } catch {
        termsAndConditions = existingCasino.termsAndConditions;
    }

    return {
        ...newData,
        payoutRatio,
        payoutSpeed,
      
        paymentMethods: cleanPaymentMethods(newData.paymentMethods) || existingCasino.paymentMethods,
        termsAndConditions: {
            firstDepositBonus: {
                minDeposit: ensureNumericValue(
                    termsAndConditions.firstDepositBonus?.minDeposit,
                    existingCasino.termsAndConditions.firstDepositBonus.minDeposit
                ),
                maxCashout: ensureNumericValue(
                    termsAndConditions.firstDepositBonus?.maxCashout,
                    existingCasino.termsAndConditions.firstDepositBonus.maxCashout
                ),
                excludedPaymentMethods: cleanArrayData(
                    termsAndConditions.firstDepositBonus?.excludedPaymentMethods ||
                    existingCasino.termsAndConditions.firstDepositBonus.excludedPaymentMethods
                ),
                wageringRequirement: ensureNumericValue(
                    termsAndConditions.firstDepositBonus?.wageringRequirement,
                    existingCasino.termsAndConditions.firstDepositBonus.wageringRequirement
                ),
                bonusExpirationDays: ensureNumericValue(
                    termsAndConditions.firstDepositBonus?.bonusExpirationDays,
                    existingCasino.termsAndConditions.firstDepositBonus.bonusExpirationDays
                ),
                processingSpeed: termsAndConditions.firstDepositBonus?.processingSpeed ||
                    existingCasino.termsAndConditions.firstDepositBonus.processingSpeed ||
                    "Instant",
                freeSpinsConditions: {
                    wageringRequirement: ensureNumericValue(
                        termsAndConditions.firstDepositBonus?.freeSpinsConditions?.wageringRequirement,
                        existingCasino.termsAndConditions.firstDepositBonus.freeSpinsConditions.wageringRequirement
                    ),
                    maxCashout: ensureNumericValue(
                        termsAndConditions.firstDepositBonus?.freeSpinsConditions?.maxCashout,
                        existingCasino.termsAndConditions.firstDepositBonus.freeSpinsConditions.maxCashout
                    ),
                    expirationDays: ensureNumericValue(
                        termsAndConditions.firstDepositBonus?.freeSpinsConditions?.expirationDays,
                        existingCasino.termsAndConditions.firstDepositBonus.freeSpinsConditions.expirationDays
                    )
                },
                bonusPercentage: ensureNumericValue(
                    termsAndConditions.firstDepositBonus?.bonusPercentage,
                    existingCasino.termsAndConditions.firstDepositBonus.bonusPercentage
                ),
                claimTimeLimit: ensureNumericValue(
                    termsAndConditions.firstDepositBonus?.claimTimeLimit,
                    existingCasino.termsAndConditions.firstDepositBonus.claimTimeLimit
                ),
                currencies: cleanArrayData(
                    termsAndConditions.firstDepositBonus?.currencies ||
                    existingCasino.termsAndConditions.firstDepositBonus.currencies
                )
            },
            generalTerms: cleanArrayData(termsAndConditions.generalTerms || existingCasino.termsAndConditions.generalTerms),
            eligibilityRequirements: cleanArrayData(termsAndConditions.eligibilityRequirements || existingCasino.termsAndConditions.eligibilityRequirements),
            restrictedCountries: cleanArrayData(termsAndConditions.restrictedCountries || existingCasino.termsAndConditions.restrictedCountries),
            additionalNotes: cleanArrayData(termsAndConditions.additionalNotes || existingCasino.termsAndConditions.additionalNotes)
        },
        categoryRatings: categoryRatings.map((rating: any) => ({
            ...rating,
            score: Number(parseFloat(String(rating.score || 0)).toFixed(1))
        })),
        contentSections: contentSections.map((section: any) => ({
            title: section.title || '',
            content: section.content || '',
            order: Number(section.order || 0)
        })),
        established: ensureNumericValue(newData.established, existingCasino.established),
        ourRating: ensureNumericValue(newData.ourRating, existingCasino.ourRating),
        minDeposit: ensureNumericValue(newData.minDeposit, existingCasino.minDeposit),
        maxPayout: ensureNumericValue(newData.maxPayout, existingCasino.maxPayout),
        advantages: cleanArrayData(newData.advantages || existingCasino.advantages),
        disadvantages: cleanArrayData(newData.disadvantages || existingCasino.disadvantages),
        currencies: cleanArrayData(newData.currencies || existingCasino.currencies),
        licenses: cleanArrayData(newData.licenses || existingCasino.licenses),
        securityMeasures: cleanArrayData(newData.securityMeasures || existingCasino.securityMeasures),
        fairnessVerification: cleanArrayData(newData.fairnessVerification || existingCasino.fairnessVerification),
    };
};
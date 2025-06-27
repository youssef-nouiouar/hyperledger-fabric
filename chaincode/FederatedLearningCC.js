/**
 * FederatedLearningCC - Chaincode pour la gestion de l'apprentissage fédéré
 * Hyperledger Fabric Chaincode pour le projet de Master
 * 
 * generateHash a modify after
 * completeSession , i have to add a controller 
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class FederatedLearningCC extends Contract {
    
    constructor() {
        super('FederatedLearningCC');
    }
    // Fonction utilitaire pour obtenir le timestamp depuis la transaction
    getTxTimestamp(ctx) {
        const timestamp = ctx.stub.getTxTimestamp();
        const seconds = timestamp.seconds.low || timestamp.seconds;
        return new Date(seconds * 1000).toISOString();
    }
    /**
     * Initialise le chaincode
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize FL Ledger ===========');
        
        // Initialiser les compteurs
        await ctx.stub.putState('sessionCounter', Buffer.from('0'));
        await ctx.stub.putState('updateCounter', Buffer.from('0'));
        
        // Initialiser les budgets de confidentialité par défaut pour chaque organisation
        const defaultBudgets = [
            {
                budgetId: 'BUDGET_org1',
                orgId: 'org1',
                sessionId: null, // Budget global
                totalBudget: 10.0,
                remainingBudget: 10.0,
                lastUpdated: this.getTxTimestamp(ctx)
            },
            {
                budgetId: 'BUDGET_org2',
                orgId: 'org2',
                sessionId: null,
                totalBudget: 10.0,
                remainingBudget: 10.0,
                lastUpdated: this.getTxTimestamp(ctx)
            },
            {
                budgetId: 'BUDGET_org3',
                orgId: 'org3',
                sessionId: null,
                totalBudget: 10.0,
                remainingBudget: 10.0,
                lastUpdated: this.getTxTimestamp(ctx)
            }
        ];
        
        // Enregistrer les budgets
        for (const budget of defaultBudgets) {
            await ctx.stub.putState(`PRIVACYBUDGET_${budget.budgetId}`, Buffer.from(JSON.stringify(budget)));
        }
        
        console.info('============= END : Initialize FL Ledger ===========');
    }
    
    /**
     * Créer une nouvelle session d'apprentissage fédéré
     */
    async createFLSession(ctx, sessionInfo) {
        const session = JSON.parse(sessionInfo);
        
        // Validation des champs obligatoires
        const requiredFields = ['sessionName', 'agreementId', 'modelType', 'maxRounds', 'privacyEpsilon'];
        for (const field of requiredFields) {
            if (!session[field]) {
                throw new Error(`Champ obligatoire manquant: ${field}`);
            }
        }
        
        // Vérifier que l'accord de collaboration existe (cross-chaincode query simulée)
        // Dans un vrai système, on utiliserait InvokeChaincode
        // Vérifier que le dataset existe
        // const args = ['getCollaborationById', session.agreementId, String(active)];
        // const response = await ctx.stub.invokeChaincode('DataSharingCC', args, ctx.stub.getChannelID());
    
        // if (!response || response.status !== 200) {
        //     throw new Error(`Failed to get the collaboration id ${agreementId}. It may not exist or is not active.`);
        // }
        // const collaboration = JSON.parse(response.payload.toString());
        
        /////////////////
        const agreementKey = `AGREEMENT_${session.agreementId}`;
        // Pour le prototype, on suppose que l'accord existe
        
        // Générer un ID unique pour la session
        const counterAsBytes = await ctx.stub.getState('sessionCounter');
        let counter = parseInt(counterAsBytes.toString()) + 1;
        const sessionId = `FL${counter.toString().padStart(3, '0')}`;
        
        // Créer l'objet session
        const newSession = {
            sessionId: sessionId,
            sessionName: session.sessionName,
            agreementId: session.agreementId,
            participants: session.participants || [], //  use collaboration instead of session.participants
            modelType: session.modelType,
            modelArchitecture: session.modelArchitecture || {},
            currentRound: 0,
            maxRounds: session.maxRounds,
            privacyEpsilon: session.privacyEpsilon,
            minParticipants: session.minParticipants || 2,
            aggregationMethod: session.aggregationMethod || 'fedavg',
            status: 'initialized',
            createdAt: this.getTxTimestamp(ctx),
            createdBy: session.createdBy,
            completedAt: null,
            currentAccuracy: null,
            bestAccuracy: null,
            totalUpdatesReceived: 0,
            anomaliesDetected: 0,
            learningRate: session.learningRate || 0.01,
            targetMetric: session.targetMetric || 'accuracy',
            targetValue: session.targetValue || 0.95
        };
        
        // Sauvegarder la session
        await ctx.stub.putState(`SESSION_${sessionId}`, Buffer.from(JSON.stringify(newSession)));
        await ctx.stub.putState('sessionCounter', Buffer.from(counter.toString()));
        
        // Créer des budgets de confidentialité spécifiques à la session pour chaque participant
        for (const participant of session.participants) {
            const sessionBudget = {
                budgetId: `BUDGET_${sessionId}_${participant}`,
                orgId: participant,
                sessionId: sessionId,
                totalBudget: session.maxRounds * session.privacyEpsilon,
                remainingBudget: session.maxRounds * session.privacyEpsilon,
                lastUpdated: this.getTxTimestamp(ctx)
            };
            await ctx.stub.putState(`PRIVACYBUDGET_${sessionBudget.budgetId}`, Buffer.from(JSON.stringify(sessionBudget)));
        }
        
        // Émettre un événement
        await ctx.stub.setEvent('FLSessionCreated', Buffer.from(JSON.stringify({
            sessionId: sessionId,
            sessionName: session.sessionName,
            participants: session.participants
        })));
        
        return JSON.stringify(newSession);
    }
    
    /**
     * Démarrer une session FL
     */
    async startSession(ctx, sessionId) {
        // Récupérer la session
        const sessionAsBytes = await ctx.stub.getState(`SESSION_${sessionId}`);
        if (!sessionAsBytes || sessionAsBytes.length === 0) {
            throw new Error(`Session ${sessionId} n'existe pas`);
        }
        
        const session = JSON.parse(sessionAsBytes.toString());
        
        // Vérifier le statut
        if (session.status !== 'initialized') {
            throw new Error(`Session ne peut être démarrée, statut actuel: ${session.status}`);
        }
        
        // Vérifier qu'il y a assez de participants
        if (session.participants.length < session.minParticipants) {
            throw new Error(`Nombre insuffisant de participants: ${session.participants.length}/${session.minParticipants}`);
        }
        
        // Mettre à jour le statut
        session.status = 'active';
        session.currentRound = 1;
        session.startedAt = this.getTxTimestamp(ctx);
        
        // Sauvegarder
        await ctx.stub.putState(`SESSION_${sessionId}`, Buffer.from(JSON.stringify(session)));
        
        // Émettre un événement pour notifier les participants
        await ctx.stub.setEvent('FLSessionStarted', Buffer.from(JSON.stringify({
            sessionId: sessionId,
            currentRound: 1
        })));
        
        return JSON.stringify(session);
    }
    
    /**
     * Soumettre une mise à jour de modèle
     */
    async submitModelUpdate(ctx, updateInfo) {
        const update = JSON.parse(updateInfo);
        
        // Validation
        const requiredFields = ['sessionId', 'orgId', 'round', 'updateHash', 'privacyBudgetUsed'];
        for (const field of requiredFields) {
            if (update[field] === undefined) {
                throw new Error(`Champ obligatoire manquant: ${field}`);
            }
        }
        
        // Récupérer la session
        const sessionAsBytes = await ctx.stub.getState(`SESSION_${update.sessionId}`);
        if (!sessionAsBytes || sessionAsBytes.length === 0) {
            throw new Error(`Session ${update.sessionId} n'existe pas`);
        }
        
        const session = JSON.parse(sessionAsBytes.toString());
        
        // Vérifications
        if (session.status !== 'active') {
            throw new Error('La session n\'est pas active');
        }
        
        if (update.round !== session.currentRound) {
            throw new Error(`Round incorrect. Attendu: ${session.currentRound}, Reçu: ${update.round}`);
        }
        
        if (!session.participants.includes(update.orgId)) {
            throw new Error('Organisation non autorisée pour cette session');
        }
        
        // Vérifier le budget de confidentialité
        const budgetKey = `PRIVACYBUDGET_BUDGET_${update.sessionId}_${update.orgId}`;
        const budgetAsBytes = await ctx.stub.getState(budgetKey);
        if (!budgetAsBytes || budgetAsBytes.length === 0) {
            throw new Error('Budget de confidentialité non trouvé');
        }
        
        const budget = JSON.parse(budgetAsBytes.toString());
        if (budget.remainingBudget < update.privacyBudgetUsed) {
            throw new Error(`Budget DP insuffisant. Restant: ${budget.remainingBudget}, Demandé: ${update.privacyBudgetUsed}`);
        }
        
        // Vérifier qu'une mise à jour n'a pas déjà été soumise pour ce round
        const existingUpdateKey = `UPDATE_${update.sessionId}_R${update.round}_${update.orgId}`;
        const existingUpdate = await ctx.stub.getState(existingUpdateKey);
        if (existingUpdate && existingUpdate.length > 0) {
            throw new Error('Une mise à jour a déjà été soumise pour ce round');
        }
        
        // Générer un ID unique pour la mise à jour
        const counterAsBytes = await ctx.stub.getState('updateCounter');
        let counter = parseInt(counterAsBytes.toString()) + 1;
        const updateId = `UPD${counter.toString().padStart(6, '0')}`;
        
        // Calculer le score d'anomalie (simulation)
        const anomalyScore = update.metrics ? this.calculateAnomalyScore(update.metrics) : 0;
        
        // Créer l'objet mise à jour
        const modelUpdate = {
            updateId: updateId,
            sessionId: update.sessionId,
            orgId: update.orgId,
            round: update.round,
            updateHash: update.updateHash,
            privacyBudgetUsed: update.privacyBudgetUsed,
            submittedAt: this.getTxTimestamp(ctx),
            isValid: anomalyScore < 0.7, // Seuil d'anomalie
            anomalyScore: anomalyScore,
            metrics: update.metrics || {},
            computationTime: update.computationTime || null,
            samplesUsed: update.samplesUsed || null
        };
        
        // Sauvegarder la mise à jour
        await ctx.stub.putState(existingUpdateKey, Buffer.from(JSON.stringify(modelUpdate)));
        await ctx.stub.putState('updateCounter', Buffer.from(counter.toString()));
        
        // Mettre à jour le budget de confidentialité
        budget.remainingBudget -= update.privacyBudgetUsed;
        budget.lastUpdated = this.getTxTimestamp(ctx);
        await ctx.stub.putState(budgetKey, Buffer.from(JSON.stringify(budget)));
        
        // Mettre à jour les statistiques de la session
        session.totalUpdatesReceived += 1;
        if (anomalyScore >= 0.7) {
            session.anomaliesDetected += 1;
        }
        
        // Vérifier si toutes les mises à jour du round sont reçues
        const updatesReceived = await this.countRoundUpdates(ctx, update.sessionId, update.round);
        if (updatesReceived === session.participants.length) {
            // Déclencher l'agrégation
            await this.triggerAggregation(ctx, session);
        } else {
            // Sauvegarder la session mise à jour
            await ctx.stub.putState(`SESSION_${update.sessionId}`, Buffer.from(JSON.stringify(session)));
        }
        
        // Émettre un événement
        await ctx.stub.setEvent('ModelUpdateSubmitted', Buffer.from(JSON.stringify({
            updateId: updateId,
            sessionId: update.sessionId,
            orgId: update.orgId,
            round: update.round,
            isValid: modelUpdate.isValid
        })));
        
        return JSON.stringify(modelUpdate);
    }
    
    /**
     * Calculer un score d'anomalie simple
     */
    calculateAnomalyScore(metrics) {
        if (!metrics.loss || metrics.loss < 0 || metrics.loss > 10) {
            return 0.9;
        }
        if (metrics.accuracy && (metrics.accuracy < 0 || metrics.accuracy > 1)) {
            return 0.9;
        }
        
        // Calculer un score basé sur les métriques de manière déterministe
        const accuracyScore = metrics.accuracy ? (1 - metrics.accuracy) * 0.5 : 0.5;
        const lossScore = metrics.loss ? Math.min(metrics.loss / 10, 1) * 0.5 : 0.5;
        
        return accuracyScore + lossScore;
    }
    
    /**
     * Compter les mises à jour reçues pour un round
     */
    async countRoundUpdates(ctx, sessionId, round) {
        let count = 0;
        const sessionAsBytes = await ctx.stub.getState(`SESSION_${sessionId}`);
        const session = JSON.parse(sessionAsBytes.toString());
        
        for (const participant of session.participants) {
            const updateKey = `UPDATE_${sessionId}_R${round}_${participant}`;
            const update = await ctx.stub.getState(updateKey);
            if (update && update.length > 0) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Déclencher l'agrégation des modèles
     */
    async triggerAggregation(ctx, session) {
        const sessionId = session.sessionId;
        const round = session.currentRound;
        
        // Collecter toutes les mises à jour valides du round
        const validUpdates = [];
        for (const participant of session.participants) {
            const updateKey = `UPDATE_${sessionId}_R${round}_${participant}`;
            const updateAsBytes = await ctx.stub.getState(updateKey);
            if (updateAsBytes && updateAsBytes.length > 0) {
                const update = JSON.parse(updateAsBytes.toString());
                if (update.isValid) {
                    validUpdates.push(update);
                }
            }
        }
        
        // Vérifier qu'il y a assez de mises à jour valides
        if (validUpdates.length < session.minParticipants) {
            // Pas assez de mises à jour valides, terminer la session
            session.status = 'failed';
            session.failureReason = `Pas assez de mises à jour valides au round ${round}`;
            session.completedAt = this.getTxTimestamp(ctx);
        } else {
            // Effectuer l'agrégation (simulée) // a reviser
            const aggregationResult = {
                round: round,
                method: session.aggregationMethod,
                participantsCount: validUpdates.length,
                timestamp: this.getTxTimestamp(ctx),
                aggregatedModelHash: this.generateHash(`aggregated_${sessionId}_${round}`),
                metrics: this.aggregateMetrics(validUpdates)
            };
            
            // Sauvegarder le résultat d'agrégation
            await ctx.stub.putState(
                `AGGREGATION_${sessionId}_R${round}`, 
                Buffer.from(JSON.stringify(aggregationResult))
            );
            
            // Mettre à jour les métriques de la session
            session.currentAccuracy = aggregationResult.metrics.accuracy;
            if (!session.bestAccuracy || aggregationResult.metrics.accuracy > session.bestAccuracy) {
                session.bestAccuracy = aggregationResult.metrics.accuracy;
                session.bestRound = round;
            }
            
            // Vérifier si on a atteint l'objectif ou le nombre max de rounds
            if (round >= session.maxRounds || 
                (session.targetMetric === 'accuracy' && session.currentAccuracy >= session.targetValue)) {
                session.status = 'completed';
                session.completedAt = this.getTxTimestamp(ctx);
                session.finalMetrics = aggregationResult.metrics;
            } else {
                // Passer au round suivant
                session.currentRound += 1;
            }
        }
        
        // Sauvegarder la session mise à jour
        await ctx.stub.putState(`SESSION_${sessionId}`, Buffer.from(JSON.stringify(session)));
        
        // Émettre un événement
        await ctx.stub.setEvent('AggregationCompleted', Buffer.from(JSON.stringify({
            sessionId: sessionId,
            round: round,
            nextRound: session.currentRound,
            status: session.status,
            currentAccuracy: session.currentAccuracy
        })));
    }
    
    /**
     * Agréger les métriques des mises à jour
     */
    aggregateMetrics(updates) {
        let totalAccuracy = 0;
        let totalLoss = 0;
        let count = 0;
        
        for (const update of updates) {
            if (update.metrics) {
                if (update.metrics.accuracy !== undefined) {
                    totalAccuracy += update.metrics.accuracy;
                    count++;
                }
                if (update.metrics.loss !== undefined) {
                    totalLoss += update.metrics.loss;
                }
            }
        }
        
        return {
            accuracy: count > 0 ? totalAccuracy / count : 0,
            loss: count > 0 ? totalLoss / count : 0,
            participantsCount: updates.length
        };
    }
    
    /**
     * Générer un hash simple (pour la simulation)
     */
    generateHash(input) {
        // Dans un vrai système, on utiliserait une vraie fonction de hachage
        return Buffer.from(input).toString('base64').substring(0, 32);
    }
    
    /**
     * Obtenir les détails d'une session
     */
    async getSessionDetails(ctx, sessionId) {
        const sessionAsBytes = await ctx.stub.getState(`SESSION_${sessionId}`);
        if (!sessionAsBytes || sessionAsBytes.length === 0) {
            throw new Error(`Session ${sessionId} n'existe pas`);
        }
        
        const session = JSON.parse(sessionAsBytes.toString());
        
        // Ajouter des informations supplémentaires
        const details = {
            ...session,
            roundUpdates: {}
        };
        
        // Récupérer les infos sur les mises à jour par round
        for (let round = 1; round <= session.currentRound; round++) {
            const roundInfo = {
                updates: [],
                aggregation: null
            };
            
            // Récupérer les mises à jour du round
            for (const participant of session.participants) {
                const updateKey = `UPDATE_${sessionId}_R${round}_${participant}`;
                const updateAsBytes = await ctx.stub.getState(updateKey);
                if (updateAsBytes && updateAsBytes.length > 0) {
                    const update = JSON.parse(updateAsBytes.toString());
                    roundInfo.updates.push({
                        orgId: update.orgId,
                        submittedAt: update.submittedAt,
                        isValid: update.isValid,
                        anomalyScore: update.anomalyScore,
                        metrics: update.metrics
                    });
                }
            }
            
            // Récupérer l'agrégation du round
            const aggKey = `AGGREGATION_${sessionId}_R${round}`;
            const aggAsBytes = await ctx.stub.getState(aggKey);
            if (aggAsBytes && aggAsBytes.length > 0) {
                roundInfo.aggregation = JSON.parse(aggAsBytes.toString());
            }
            
            details.roundUpdates[round] = roundInfo;
        }
        
        return JSON.stringify(details);
    }
    
    /**
     * Obtenir les sessions d'une organisation
     */
    async getMySessions(ctx, orgId) {
        const sessions = [];
        const iterator = await ctx.stub.getStateByRange('SESSION_', 'SESSION_~');
        
        try {
            while (true) {
                const result = await iterator.next();
                
                if (result.value && result.value.value.toString()) {
                    const session = JSON.parse(result.value.value.toString());
                    
                    if (session.participants.includes(orgId)) {
                        // Ajouter des infos sur le budget DP
                        const budgetKey = `PRIVACYBUDGET_BUDGET_${session.sessionId}_${orgId}`;
                        const budgetAsBytes = await ctx.stub.getState(budgetKey);
                        if (budgetAsBytes && budgetAsBytes.length > 0) {
                            const budget = JSON.parse(budgetAsBytes.toString());
                            session.myPrivacyBudget = {
                                used: budget.totalBudget - budget.remainingBudget,
                                remaining: budget.remainingBudget,
                                total: budget.totalBudget
                            };
                        }
                        
                        sessions.push(session);
                    }
                }
                
                if (result.done) {
                    await iterator.close();
                    break;
                }
            }
        } catch (err) {
            console.log(err);
        }
        
        // Trier par date de création (plus récent en premier)
        sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return JSON.stringify(sessions);
    }
    
    /**
     * Obtenir le progrès d'une session
     */
    async getSessionProgress(ctx, sessionId) {
        const sessionAsBytes = await ctx.stub.getState(`SESSION_${sessionId}`);
        if (!sessionAsBytes || sessionAsBytes.length === 0) {
            throw new Error(`Session ${sessionId} n'existe pas`);
        }
        
        const session = JSON.parse(sessionAsBytes.toString());
        
        // Calculer les statistiques de progression
        const progress = {
            sessionId: session.sessionId,
            sessionName: session.sessionName,
            status: session.status,
            currentRound: session.currentRound,
            maxRounds: session.maxRounds,
            progressPercentage: (session.currentRound / session.maxRounds) * 100,
            currentAccuracy: session.currentAccuracy,
            targetAccuracy: session.targetValue,
            accuracyProgress: session.currentAccuracy ? (session.currentAccuracy / session.targetValue) * 100 : 0,
            participants: session.participants.length,
            totalUpdatesReceived: session.totalUpdatesReceived,
            anomaliesDetected: session.anomaliesDetected,
            startedAt: session.startedAt,
            estimatedCompletion: this.estimateCompletion(ctx,session),
            roundHistory: []
        };
        
        // Ajouter l'historique des rounds
        for (let round = 1; round <= session.currentRound; round++) {
            const aggKey = `AGGREGATION_${sessionId}_R${round}`;
            const aggAsBytes = await ctx.stub.getState(aggKey);
            if (aggAsBytes && aggAsBytes.length > 0) {
                const aggregation = JSON.parse(aggAsBytes.toString());
                progress.roundHistory.push({
                    round: round,
                    accuracy: aggregation.metrics.accuracy,
                    loss: aggregation.metrics.loss,
                    participants: aggregation.participantsCount,
                    timestamp: aggregation.timestamp
                });
            }
        }
        
        return JSON.stringify(progress);
    }
    
    /**
     * Estimer la date de complétion
     */
    estimateCompletion(ctx,session) {
        if (session.status !== 'active' || !session.startedAt) {
            return null;
        }
        
        const elapsedTime = this.getTxTimestamp(ctx) - new Date(session.startedAt); /// i should to modify after
        const roundsCompleted = session.currentRound - 1;
        
        if (roundsCompleted === 0) {
            return null;
        }
        
        const avgTimePerRound = elapsedTime / roundsCompleted;
        const remainingRounds = session.maxRounds - session.currentRound + 1;
        const estimatedRemainingTime = avgTimePerRound * remainingRounds;
        
        const estimatedDate = new Date(this.getTxTimestamp(ctx) + estimatedRemainingTime);
        return estimatedDate.toISOString();
    }
    
    /**
     * Obtenir le statut du budget de confidentialité
     */
    async getPrivacyBudgetStatus(ctx, orgId, sessionId) {
        const budgets = [];
        
        if (sessionId) {
            // Budget spécifique à une session
            const budgetKey = `PRIVACYBUDGET_BUDGET_${sessionId}_${orgId}`;
            const budgetAsBytes = await ctx.stub.getState(budgetKey);
            if (budgetAsBytes && budgetAsBytes.length > 0) {
                budgets.push(JSON.parse(budgetAsBytes.toString()));
            }
        } else {
            // Tous les budgets de l'organisation
            const iterator = await ctx.stub.getStateByRange('PRIVACYBUDGET_', 'PRIVACYBUDGET_~');
            
            try {
                while (true) {
                    const result = await iterator.next();
                    
                    if (result.value && result.value.value.toString()) {
                        const budget = JSON.parse(result.value.value.toString());
                        if (budget.orgId === orgId) {
                            budgets.push(budget);
                        }
                    }
                    
                    if (result.done) {
                        await iterator.close();
                        break;
                    }
                }
            } catch (err) {
                console.log(err);
            }
        }
        
        // Calculer les statistiques globales
        let totalAllocated = 0;
        let totalUsed = 0;
        
        for (const budget of budgets) {
            totalAllocated += budget.totalBudget;
            totalUsed += (budget.totalBudget - budget.remainingBudget);
        }
        
        return JSON.stringify({
            orgId: orgId,
            budgets: budgets,
            summary: {
                totalAllocated: totalAllocated,
                totalUsed: totalUsed,
                totalRemaining: totalAllocated - totalUsed,
                usagePercentage: totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0
            },
            timestamp: this.getTxTimestamp(ctx)
        });
    }
    
    /**
     * Obtenir l'historique des modèles d'une session
     */
    async getModelHistory(ctx, sessionId) {
        const sessionAsBytes = await ctx.stub.getState(`SESSION_${sessionId}`);
        if (!sessionAsBytes || sessionAsBytes.length === 0) {
            throw new Error(`Session ${sessionId} n'existe pas`);
        }
        
        const session = JSON.parse(sessionAsBytes.toString());
        const history = {
            sessionId: session.sessionId,
            sessionName: session.sessionName,
            modelType: session.modelType,
            rounds: []
        };
        
        // Récupérer l'historique de chaque round
        for (let round = 1; round <= session.currentRound; round++) {
            const roundData = {
                round: round,
                updates: [],
                aggregation: null
            };
            
            // Récupérer toutes les mises à jour du round
            for (const participant of session.participants) {
                const updateKey = `UPDATE_${sessionId}_R${round}_${participant}`;
                const updateAsBytes = await ctx.stub.getState(updateKey);
                if (updateAsBytes && updateAsBytes.length > 0) {
                    const update = JSON.parse(updateAsBytes.toString());
                    roundData.updates.push({
                        orgId: update.orgId,
                        updateHash: update.updateHash,
                        submittedAt: update.submittedAt,
                        isValid: update.isValid,
                        metrics: update.metrics,
                        privacyBudgetUsed: update.privacyBudgetUsed
                    });
                }
            }
            
            // Récupérer l'agrégation
            const aggKey = `AGGREGATION_${sessionId}_R${round}`;
            const aggAsBytes = await ctx.stub.getState(aggKey);
            if (aggAsBytes && aggAsBytes.length > 0) {
                roundData.aggregation = JSON.parse(aggAsBytes.toString());
            }
            
            history.rounds.push(roundData);
        }
        
        return JSON.stringify(history);
    }
    
    /**
     * Signaler une mise à jour anormale
     */
    async flagAnomalousUpdate(ctx, updateId, flagInfo) {
        const flag = JSON.parse(flagInfo);
        
        // Validation
        if (!flag.reason || !flag.reportedBy) {
            throw new Error('Informations de signalement incomplètes');
        }
        
        // Créer l'objet de signalement
        const anomalyFlag = {
            flagId: `FLAG_${updateId}_${Date.now()}`,
            updateId: updateId,
            reason: flag.reason,
            reportedBy: flag.reportedBy,
            severity: flag.severity || 'medium',
            timestamp: this.getTxTimestamp(ctx),
            evidence: flag.evidence || {}
        };
        
        // Sauvegarder le signalement
        await ctx.stub.putState(anomalyFlag.flagId, Buffer.from(JSON.stringify(anomalyFlag)));
        
        // Émettre un événement
        await ctx.stub.setEvent('AnomalyFlagged', Buffer.from(JSON.stringify({
            updateId: updateId,
            flagId: anomalyFlag.flagId,
            severity: anomalyFlag.severity
        })));
        
        return JSON.stringify(anomalyFlag);
    }
    
    /**
     * Mettre à jour le budget de confidentialité (admin)
     */
    async updatePrivacyBudget(ctx, budgetId, adjustment) {
        const adj = JSON.parse(adjustment);
        
        // Récupérer le budget
        const budgetAsBytes = await ctx.stub.getState(`PRIVACYBUDGET_${budgetId}`);
        if (!budgetAsBytes || budgetAsBytes.length === 0) {
            throw new Error(`Budget ${budgetId} n'existe pas`);
        }
        
        const budget = JSON.parse(budgetAsBytes.toString());
        
        // Appliquer l'ajustement
        if (adj.addToTotal) {
            budget.totalBudget += adj.addToTotal;
            budget.remainingBudget += adj.addToTotal;
        }
        
        if (adj.setRemaining !== undefined) {
            budget.remainingBudget = Math.min(adj.setRemaining, budget.totalBudget);
        }
        
        budget.lastUpdated = this.getTxTimestamp(ctx);
        budget.lastAdjustment = {
            reason: adj.reason || 'Manual adjustment',
            amount: adj.addToTotal || 0,
            timestamp: this.getTxTimestamp(ctx)
        };
        
        // Sauvegarder
        await ctx.stub.putState(`PRIVACYBUDGET_${budgetId}`, Buffer.from(JSON.stringify(budget)));
        
        return JSON.stringify(budget);
    }
    
    /**
     * Terminer une session manuellement ,
     */
    async completeSession(ctx, sessionId, reason) {
        const sessionAsBytes = await ctx.stub.getState(`SESSION_${sessionId}`);
        if (!sessionAsBytes || sessionAsBytes.length === 0) {
            throw new Error(`Session ${sessionId} n'existe pas`);
        }
        
        const session = JSON.parse(sessionAsBytes.toString());
        
        if (session.status === 'completed' || session.status === 'failed') {
            throw new Error('La session est déjà terminée');
        }
        
        // Terminer la session
        session.status = 'completed';
        session.completedAt = this.getTxTimestamp(ctx);
        session.completionReason = reason || 'Manual completion';
        
        // Calculer les statistiques finales
        session.finalStats = {
            totalRounds: session.currentRound,
            finalAccuracy: session.currentAccuracy || 0,
            bestAccuracy: session.bestAccuracy || 0,
            bestRound: session.bestRound || 0,
            totalUpdates: session.totalUpdatesReceived,
            anomaliesDetected: session.anomaliesDetected,
            completionRate: (session.currentRound / session.maxRounds) * 100
        };
        
        // Sauvegarder
        await ctx.stub.putState(`SESSION_${sessionId}`, Buffer.from(JSON.stringify(session)));
        
        // Émettre un événement
        await ctx.stub.setEvent('SessionCompleted', Buffer.from(JSON.stringify({
            sessionId: sessionId,
            reason: session.completionReason,
            finalStats: session.finalStats
        })));
        
        return JSON.stringify(session);
    }
    
    /**
     * Obtenir les statistiques globales du système FL
     */
    async getSystemStats(ctx) {
        let totalSessions = 0;
        let activeSessions = 0;
        let completedSessions = 0;
        let failedSessions = 0;
        let totalUpdates = 0;
        let totalAnomalies = 0;
        let totalBudgetUsed = 0;
        
        // Compter les sessions
        const sessionIterator = await ctx.stub.getStateByRange('SESSION_', 'SESSION_~');
        try {
            while (true) {
                const result = await sessionIterator.next();
                if (result.value && result.value.value.toString()) {
                    totalSessions++;
                    const session = JSON.parse(result.value.value.toString());
                    
                    switch (session.status) {
                        case 'active':
                            activeSessions++;
                            break;
                        case 'completed':
                            completedSessions++;
                            break;
                        case 'failed':
                            failedSessions++;
                            break;
                    }
                    
                    totalUpdates += session.totalUpdatesReceived || 0;
                    totalAnomalies += session.anomaliesDetected || 0;
                }
                if (result.done) {
                    await sessionIterator.close();
                    break;
                }
            }
        } catch (err) {
            console.log(err);
        }
        
        // Calculer le budget total utilisé
        const budgetIterator = await ctx.stub.getStateByRange('PRIVACYBUDGET_', 'PRIVACYBUDGET_~');
        try {
            while (true) {
                const result = await budgetIterator.next();
                if (result.value && result.value.value.toString()) {
                    const budget = JSON.parse(result.value.value.toString());
                    if (budget.sessionId) { // Seulement les budgets de session
                        totalBudgetUsed += (budget.totalBudget - budget.remainingBudget);
                    }
                }
                if (result.done) {
                    await budgetIterator.close();
                    break;
                }
            }
        } catch (err) {
            console.log(err);
        }
        
        return JSON.stringify({
            totalSessions: totalSessions,
            activeSessions: activeSessions,
            completedSessions: completedSessions,
            failedSessions: failedSessions,
            totalUpdates: totalUpdates,
            totalAnomalies: totalAnomalies,
            anomalyRate: totalUpdates > 0 ? (totalAnomalies / totalUpdates) * 100 : 0,
            totalPrivacyBudgetUsed: totalBudgetUsed,
            timestamp: this.getTxTimestamp(ctx)
        });
    }
    
    /**
     * Obtenir les performances d'une organisation
     */
    async getOrganizationPerformance(ctx, orgId) {
        const performance = {
            orgId: orgId,
            sessions: {
                total: 0,
                active: 0,
                completed: 0
            },
            updates: {
                total: 0,
                valid: 0,
                anomalous: 0
            },
            privacyBudget: {
                totalAllocated: 0,
                totalUsed: 0
            },
            averageAccuracy: 0,
            bestAccuracy: 0,
            participationRate: 0
        };
        
        // Analyser toutes les sessions
        const sessionIterator = await ctx.stub.getStateByRange('SESSION_', 'SESSION_~');
        let accuracySum = 0;
        let accuracyCount = 0;
        
        try {
            while (true) {
                const result = await sessionIterator.next();
                if (result.value && result.value.value.toString()) {
                    const session = JSON.parse(result.value.value.toString());
                    
                    if (session.participants.includes(orgId)) {
                        performance.sessions.total++;
                        
                        switch (session.status) {
                            case 'active':
                                performance.sessions.active++;
                                break;
                            case 'completed':
                                performance.sessions.completed++;
                                if (session.currentAccuracy) {
                                    accuracySum += session.currentAccuracy;
                                    accuracyCount++;
                                    if (session.currentAccuracy > performance.bestAccuracy) {
                                        performance.bestAccuracy = session.currentAccuracy;
                                    }
                                }
                                break;
                        }
                        
                        // Compter les mises à jour de cette organisation
                        for (let round = 1; round <= session.currentRound; round++) {
                            const updateKey = `UPDATE_${session.sessionId}_R${round}_${orgId}`;
                            const updateAsBytes = await ctx.stub.getState(updateKey);
                            if (updateAsBytes && updateAsBytes.length > 0) {
                                const update = JSON.parse(updateAsBytes.toString());
                                performance.updates.total++;
                                if (update.isValid) {
                                    performance.updates.valid++;
                                } else {
                                    performance.updates.anomalous++;
                                }
                            }
                        }
                    }
                }
                if (result.done) {
                    await sessionIterator.close();
                    break;
                }
            }
        } catch (err) {
            console.log(err);
        }
        
        // Calculer les moyennes
        if (accuracyCount > 0) {
            performance.averageAccuracy = accuracySum / accuracyCount;
        }
        
        if (performance.updates.total > 0) {
            performance.participationRate = (performance.updates.valid / performance.updates.total) * 100;
        }
        
        // Analyser l'utilisation du budget de confidentialité
        const budgetIterator = await ctx.stub.getStateByRange('PRIVACYBUDGET_', 'PRIVACYBUDGET_~');
        try {
            while (true) {
                const result = await budgetIterator.next();
                if (result.value && result.value.value.toString()) {
                    const budget = JSON.parse(result.value.value.toString());
                    if (budget.orgId === orgId && budget.sessionId) {
                        performance.privacyBudget.totalAllocated += budget.totalBudget;
                        performance.privacyBudget.totalUsed += (budget.totalBudget - budget.remainingBudget);
                    }
                }
                if (result.done) {
                    await budgetIterator.close();
                    break;
                }
            }
        } catch (err) {
            console.log(err);
        }
        
        performance.timestamp = this.getTxTimestamp(ctx);
        
        return JSON.stringify(performance);
    }
    
    /**
     * Rejoindre une session FL existante
     */
    async joinSession(ctx, sessionId, orgId) {
        const sessionAsBytes = await ctx.stub.getState(`SESSION_${sessionId}`);
        if (!sessionAsBytes || sessionAsBytes.length === 0) {
            throw new Error(`Session ${sessionId} n'existe pas`);
        }
        
        const session = JSON.parse(sessionAsBytes.toString());
        
        // Vérifications
        if (session.status !== 'initialized') {
            throw new Error('La session a déjà commencé ou est terminée');
        }
        
        if (session.participants.includes(orgId)) {
            throw new Error('Organisation déjà inscrite à cette session');
        }
        
        if (session.participants.length >= 3) {
            throw new Error('Nombre maximum de participants atteint');
        }
        
        // Ajouter le participant
        session.participants.push(orgId);
        
        // Créer un budget de confidentialité pour ce participant
        const sessionBudget = {
            budgetId: `BUDGET_${sessionId}_${orgId}`,
            orgId: orgId,
            sessionId: sessionId,
            totalBudget: session.maxRounds * session.privacyEpsilon,
            remainingBudget: session.maxRounds * session.privacyEpsilon,
            lastUpdated: this.getTxTimestamp(ctx)
        };
        
        // Sauvegarder
        await ctx.stub.putState(`SESSION_${sessionId}`, Buffer.from(JSON.stringify(session)));
        await ctx.stub.putState(`PRIVACYBUDGET_${sessionBudget.budgetId}`, Buffer.from(JSON.stringify(sessionBudget)));
        
        // Émettre un événement
        await ctx.stub.setEvent('ParticipantJoined', Buffer.from(JSON.stringify({
            sessionId: sessionId,
            orgId: orgId,
            participantsCount: session.participants.length
        })));
        
        return JSON.stringify(session);
    }
    
    /**
     * Obtenir les sessions disponibles pour rejoindre
     */
    async getAvailableSessions(ctx, orgId) {
        const availableSessions = [];
        const iterator = await ctx.stub.getStateByRange('SESSION_', 'SESSION_~');
        
        try {
            while (true) {
                const result = await iterator.next();
                
                if (result.value && result.value.value.toString()) {
                    const session = JSON.parse(result.value.value.toString());
                    
                    // Session disponible si : initialized, pas déjà membre, et place disponible
                    if (session.status === 'initialized' && 
                        !session.participants.includes(orgId) && 
                        session.participants.length < 3) {
                        
                        availableSessions.push({
                            sessionId: session.sessionId,
                            sessionName: session.sessionName,
                            modelType: session.modelType,
                            participants: session.participants,
                            spotsAvailable: 3 - session.participants.length,
                            maxRounds: session.maxRounds,
                            privacyEpsilon: session.privacyEpsilon,
                            createdAt: session.createdAt,
                            createdBy: session.createdBy
                        });
                    }
                }
                
                if (result.done) {
                    await iterator.close();
                    break;
                }
            }
        } catch (err) {
            console.log(err);
        }
        
        // Trier par date de création (plus récent en premier)
        availableSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return JSON.stringify(availableSessions);
    }
}

module.exports = FederatedLearningCC;
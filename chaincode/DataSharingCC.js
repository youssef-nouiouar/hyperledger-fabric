
/**
 * DataSharingCC - Chaincode pour la gestion du partage de datasets
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class DataSharingCC extends Contract {
    
    constructor() {
        super('DataSharingCC');
    }
     getTxTimestamp(ctx) {
         const timestamp = ctx.stub.getTxTimestamp();
         const seconds = timestamp.seconds.low || timestamp.seconds;
         return new Date(seconds * 1000).toISOString();
     }
    /**
     * Initialise le chaincode avec des données de test
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        // Initialiser les organisations
        const organizations = [
            {
                orgId: 'org1',
                orgName: 'Hôpital Universitaire',
                orgType: 'hospital',
                contactEmail: 'data@hospital.org',
                capabilities: ['medical_data', 'clinical_trials', 'fl_computing'],
                reputationScore: 95,
                joinedAt: this.getTxTimestamp(ctx),
                isActive: true
            },
            {
                orgId: 'org2',
                orgName: 'Institut de Recherche IA',
                orgType: 'university',
                contactEmail: 'research@university.edu',
                capabilities: ['ml_expertise', 'data_analysis', 'fl_computing'],
                reputationScore: 92,
                joinedAt: this.getTxTimestamp(ctx),
                isActive: true
            },
            {
                orgId: 'org3',
                orgName: 'clinique privéé Atlas',
                orgType: 'clinic',
                contactEmail: 'data@atlasclinic.com',
                capabilities: ['daignostic_data', 'ecg', 'fl_computing'],
                reputationScore: 88,
                joinedAt: this.getTxTimestamp(ctx),
                isActive: true
            }
        ];
        
        // Enregistrer les organisations
        for (const org of organizations) {
            await ctx.stub.putState(`ORG_${org.orgId}`, Buffer.from(JSON.stringify(org)));
        }
        
        // Initialiser des datasets exemples
        const datasets = [
            {
                datasetId: 'DS001',
                orgId: 'org1', // i should change it to org1
                title: 'Données Cardiaques Anonymisées',
                domain: 'medical',
                description: 'Dataset de 50,000 ECG avec diagnostics pour prédiction des maladies cardiaques',
                dataType: 'structured',
                sizeCategory: 'large',
                qualityLevel: 'excellent',
                isAvailable: true,
                createdAt: this.getTxTimestamp(ctx),
                tags: ['ecg', 'cardiology', 'healthcare', 'clinical'],
                statistics: {
                    recordCount: 50000,
                    features: 12,
                    completeness: 98.5,
                    lastUpdated: this.getTxTimestamp(ctx)
                },
                privacyLevel: 'anonymized',
                accessCount: 0
            },
            {
                datasetId: 'DS002', 
                orgId: 'org3', 
                title: 'diagnostic Data for Heart Disease',
                domain: 'medical',
                description: 'diagnostic data for heart disease with 100,000 records and 23 features',
                dataType: 'structured',
                sizeCategory: 'large',
                qualityLevel: 'good',
                isAvailable: true,
                createdAt: this.getTxTimestamp(ctx),
                tags: ['', 'diagnostic', 'clinic', 'healthcare'],
                statistics: {
                    recordCount: 100000,
                    features: 23,
                    completeness: 95.2,
                    lastUpdated: this.getTxTimestamp(ctx)
                },
                privacyLevel: 'pseudonymized',
                accessCount: 0
            }
        ];
        
        // Enregistrer les datasets
        for (const dataset of datasets) {
            await ctx.stub.putState(`DATASET_${dataset.datasetId}`, Buffer.from(JSON.stringify(dataset)));
        }
        
        // Initialiser les compteurs
        await ctx.stub.putState('datasetCounter', Buffer.from('2'));
        await ctx.stub.putState('requestCounter', Buffer.from('0'));
        await ctx.stub.putState('agreementCounter', Buffer.from('0'));
        
        console.info('============= END : Initialize Ledger ===========');
    }
    
    /**
     * Publier un nouveau dataset dans le catalogue
     */
    async publishDataset(ctx, datasetInfo) {
        const dataset = JSON.parse(datasetInfo);
        
        // Validation des champs obligatoires
        const requiredFields = ['orgId', 'title', 'domain', 'description', 'dataType', 'sizeCategory', 'qualityLevel'];
        for (const field of requiredFields) {
            if (!dataset[field]) {
                throw new Error(`Champ obligatoire manquant: ${field}`);
            }
        }
        
        // Vérifier que l'organisation existe
        const orgAsBytes = await ctx.stub.getState(`ORG_${dataset.orgId}`);
        if (!orgAsBytes || orgAsBytes.length === 0) {
            throw new Error(`Organisation ${dataset.orgId} n'existe pas`);
        }
        
        // Vérifier que le client est bien l'organisation
        const clientOrgId = ctx.clientIdentity.getMSPID().replace('MSP', '').toLowerCase();
        if (clientOrgId !== dataset.orgId.toLowerCase()) {
          throw new Error(`Organisation ${clientOrgId} non autorisée à publier pour ${dataset.orgId}`);
        }

        // Générer un ID unique pour le dataset
        const counterAsBytes = await ctx.stub.getState('datasetCounter');
        let counter = parseInt(counterAsBytes.toString()) + 1;
        const datasetId = `DS${counter.toString().padStart(3, '0')}`;
        
        // Créer l'objet dataset complet 
        const newDataset = {
            datasetId: datasetId,
            orgId: dataset.orgId,
            title: dataset.title,
            domain: dataset.domain,
            description: dataset.description,
            dataType: dataset.dataType,
            sizeCategory: dataset.sizeCategory,
            qualityLevel: dataset.qualityLevel,
            isAvailable: true,
            createdAt: this.getTxTimestamp(ctx),
            tags: dataset.tags || [],
            statistics: dataset.statistics || {},
            privacyLevel: dataset.privacyLevel || 'not_specified',
            accessCount: 0
        };
        
        // Sauvegarder le dataset
        await ctx.stub.putState(`DATASET_${datasetId}`, Buffer.from(JSON.stringify(newDataset)));
        await ctx.stub.putState('datasetCounter', Buffer.from(counter.toString()));
        
        // Émettre un événement
        await ctx.stub.setEvent('DatasetPublished', Buffer.from(JSON.stringify({
            datasetId: datasetId,
            orgId: dataset.orgId,
            title: dataset.title
        })));
        
        return JSON.stringify(newDataset);
    }
    
    /**
     * Rechercher des datasets avec filtres
     */
    async searchDatasets(ctx, filters) {
        const filterObj = filters ? JSON.parse(filters) : {};
        
        // Construire la requête
        let queryString = {
            selector: {}
        };
        
        if (filterObj.domain) {
            queryString.selector.domain = filterObj.domain;
        }
        
        if (filterObj.dataType) {
            queryString.selector.dataType = filterObj.dataType;
        }
        
        if (filterObj.isAvailable !== undefined) {
            queryString.selector.isAvailable = filterObj.isAvailable;
        }
        
        // Pour une implémentation simple, on va récupérer tous les datasets et filtrer
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('DATASET_', 'DATASET_~');
        
        try {
            while (true) {
                const result = await iterator.next();
                
                if (result.value && result.value.value.toString()) {
                    const dataset = JSON.parse(result.value.value.toString());
                    
                    // Appliquer les filtres
                    let match = true;
                    
                    if (filterObj.domain && dataset.domain !== filterObj.domain) {
                        match = false;
                    }
                    
                    if (filterObj.dataType && dataset.dataType !== filterObj.dataType) {
                        match = false;
                    }
                    
                    if (filterObj.isAvailable !== undefined && dataset.isAvailable !== filterObj.isAvailable) {
                        match = false;
                    }
                    
                    if (filterObj.tags && filterObj.tags.length > 0) {
                        const hasTag = filterObj.tags.some(tag => dataset.tags.includes(tag));
                        if (!hasTag) match = false;
                    }
                    
                    if (match) {
                        // Ne pas inclure toutes les infos sensibles dans la recherche
                        allResults.push({
                            datasetId: dataset.datasetId,
                            orgId: dataset.orgId,
                            title: dataset.title,
                            domain: dataset.domain,
                            description: dataset.description,
                            dataType: dataset.dataType,
                            sizeCategory: dataset.sizeCategory,
                            qualityLevel: dataset.qualityLevel,
                            isAvailable: dataset.isAvailable,
                            tags: dataset.tags,
                            createdAt: dataset.createdAt
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
        
        return JSON.stringify(allResults);
    }
    
    /**
     * Demander des informations sur un dataset
     */
    async requestDatasetInfo(ctx, requestInfo) {
        const request = JSON.parse(requestInfo);
        
        // Validation
        if (!request.requesterOrgId || !request.targetDatasetId || !request.purpose) {
            throw new Error('Informations de demande incomplètes');
        }
        
        // Vérification de l'identité
         const clientOrg = ctx.clientIdentity.getMSPID().replace('MSP', '').toLowerCase();
         if (clientOrg !== request.requesterOrgId.toLowerCase()) {
           throw new Error(`Organisation ${clientOrg} non autorisée à faire cette demande`);
         }

        // Vérifier que le dataset existe
        const datasetAsBytes = await ctx.stub.getState(`DATASET_${request.targetDatasetId}`);
        if (!datasetAsBytes || datasetAsBytes.length === 0) {
            throw new Error(`Dataset ${request.targetDatasetId} n'existe pas`);
        }
        
        // Générer un ID unique pour la demande
        const counterAsBytes = await ctx.stub.getState('requestCounter');
        let counter = parseInt(counterAsBytes.toString()) + 1;
        const requestId = `REQ${counter.toString().padStart(3, '0')}`;
        
        // Créer l'objet demande
        const newRequest = {
            requestId: requestId,
            requesterOrgId: request.requesterOrgId,
            targetDatasetId: request.targetDatasetId,
            purpose: request.purpose,
            myContribution: request.myContribution || '',
            status: 'pending',
            createdAt: this.getTxTimestamp(ctx),
            responseText: '',
            respondedAt: null
        };
        
        // Sauvegarder la demande
        await ctx.stub.putState(`REQUEST_${requestId}`, Buffer.from(JSON.stringify(newRequest)));
        await ctx.stub.putState('requestCounter', Buffer.from(counter.toString()));
        
        // Incrémenter le compteur d'accès du dataset
        const dataset = JSON.parse(datasetAsBytes.toString());
        dataset.accessCount = (dataset.accessCount || 0) + 1;
        await ctx.stub.putState(`DATASET_${request.targetDatasetId}`, Buffer.from(JSON.stringify(dataset)));
        
        // Émettre un événement
        await ctx.stub.setEvent('InfoRequested', Buffer.from(JSON.stringify({
            requestId: requestId,
            datasetId: request.targetDatasetId,
            requesterOrgId: request.requesterOrgId
        })));
        
        return JSON.stringify(newRequest);
    }
    
    /**
     * Répondre à une demande d'information
     */
    async respondToRequest(ctx, requestId, responseInfo) {
        const response = JSON.parse(responseInfo);
        
        // Récupérer la demande
        const requestAsBytes = await ctx.stub.getState(`REQUEST_${requestId}`);
        if (!requestAsBytes || requestAsBytes.length === 0) {
            throw new Error(`Demande ${requestId} n'existe pas`);
        }
        
        const request = JSON.parse(requestAsBytes.toString());
        
        // Vérifier que la demande est en attente
        if (request.status !== 'pending') {
            throw new Error('Cette demande a déjà été traitée');
        }
        
        // Vérifier que l'appelant est le propriétaire du dataset
        const datasetAsBytes = await ctx.stub.getState(`DATASET_${request.targetDatasetId}`);
        const dataset = JSON.parse(datasetAsBytes.toString());
        
        const clientOrgId = ctx.clientIdentity.getMSPID().replace('MSP', '').toLowerCase();
        if (clientOrgId !== dataset.orgId.toLowerCase()) {
            throw new Error(`Client from ${clientOrgId} cannot access dataset for ${dataset.orgId}`);
        }
        
        // Mettre à jour la demande
        request.status = response.approved ? 'approved' : 'rejected';
        request.responseText = response.responseText || '';
        request.respondedAt = this.getTxTimestamp(ctx);
        
        // Si approuvé, inclure des informations détaillées
        if (response.approved) {
            request.detailedInfo = {
                statistics: dataset.statistics,
                privacyLevel: dataset.privacyLevel,
                updateFrequency: dataset.updateFrequency || 'on_demand',
                contactPerson: response.contactPerson || ''
            };
        }
        
        // Sauvegarder la mise à jour
        await ctx.stub.putState(`REQUEST_${requestId}`, Buffer.from(JSON.stringify(request)));
        
        // Émettre un événement
        await ctx.stub.setEvent('RequestResponded', Buffer.from(JSON.stringify({
            requestId: requestId,
            status: request.status,
            requesterOrgId: request.requesterOrgId
        })));
        
        return JSON.stringify(request);
    }
    
    /**
     * Créer un accord de collaboration (AGREEMENT_)
     */
    async createCollaboration(ctx, collaborationInfo) {
        const collab = JSON.parse(collaborationInfo);
        
        const clientOrg = ctx.clientIdentity.getMSPID().replace('MSP', '').toLowerCase();
        if (!collab.partnerOrgs.includes(clientOrg)) {
          throw new Error(`Organisation ${clientOrg} n'est pas autorisée à créer cet accord`);
        }
        // Validation
        if (!collab.partnerOrgs || collab.partnerOrgs.length < 2 || collab.partnerOrgs.length > 3) {
            throw new Error('Une collaboration doit impliquer 2 ou 3 organisations');
        }
        
        // Vérifier que toutes les organisations existent
        for (const orgId of collab.partnerOrgs) {
            const orgAsBytes = await ctx.stub.getState(`ORG_${orgId}`);
            if (!orgAsBytes || orgAsBytes.length === 0) {
                throw new Error(`Organisation ${orgId} n'existe pas`);
            }
        }
        
        // Générer un ID unique
        const counterAsBytes = await ctx.stub.getState('agreementCounter');
        let counter = parseInt(counterAsBytes.toString()) + 1;
        const agreementId = `COLLAB${counter.toString().padStart(3, '0')}`;
        
        // Créer l'accord
        const agreement = {
            agreementId: agreementId,
            partnerOrgs: collab.partnerOrgs,
            objective: collab.objective,
            datasets: collab.datasets || [],
            mlTask: collab.mlTask || 'classification',
            privacyBudget: collab.privacyBudget || 3.0,
            duration: collab.duration || '3 months',
            status: 'draft',
            createdAt: this.getTxTimestamp(ctx),
            signedBy: [collab.partnerOrgs[0]], // Le créateur signe automatiquement
            terms: collab.terms || {},
            lastModified: this.getTxTimestamp(ctx)
        };
        
        // Sauvegarder l'accord
        await ctx.stub.putState(`AGREEMENT_${agreementId}`, Buffer.from(JSON.stringify(agreement)));
        await ctx.stub.putState('agreementCounter', Buffer.from(counter.toString()));
        
        // Émettre un événement
        await ctx.stub.setEvent('CollaborationCreated', Buffer.from(JSON.stringify({
            agreementId: agreementId,
            partnerOrgs: collab.partnerOrgs
        })));
        
        return JSON.stringify(agreement);
    }
    
    /**
     * Signer un accord de collaboration
     */
    async signCollaboration(ctx, agreementId, orgId) {
        // Récupérer l'accord
        const agreementAsBytes = await ctx.stub.getState(`AGREEMENT_${agreementId}`);
        if (!agreementAsBytes || agreementAsBytes.length === 0) {
            throw new Error(`Accord ${agreementId} n'existe pas`);
        }
        
        const agreement = JSON.parse(agreementAsBytes.toString());
        
        // Vérifier que l'organisation fait partie de l'accord
        if (!agreement.partnerOrgs.includes(orgId)) {
            throw new Error('Cette organisation ne fait pas partie de cet accord');
        }
        
        // Vérifier que l'organisation n'a pas déjà signé
        if (agreement.signedBy.includes(orgId)) {
            throw new Error(`Cette organisation ${orgId} a déjà signé cet accord`);
        }
        
        // Ajouter la signature
        agreement.signedBy.push(orgId);
        agreement.lastModified = this.getTxTimestamp(ctx);
        
        // Si tous ont signé, activer l'accord
        if (agreement.signedBy.length === agreement.partnerOrgs.length) {
            agreement.status = 'active';
            agreement.activatedAt = this.getTxTimestamp(ctx);
        }
        
        // Sauvegarder
        await ctx.stub.putState(`AGREEMENT_${agreementId}`, Buffer.from(JSON.stringify(agreement)));
        
        // Émettre un événement
        await ctx.stub.setEvent('CollaborationSigned', Buffer.from(JSON.stringify({
            agreementId: agreementId,
            signedBy: orgId,
            status: agreement.status
        })));
        
        return JSON.stringify(agreement);
    }
    
    /**
     * Obtenir les détails d'un dataset (avec contrôle d'accès)
     */
    async getDatasetDetails(ctx, datasetId, requestingOrgId) {
        const datasetAsBytes = await ctx.stub.getState(`DATASET_${datasetId}`);
        if (!datasetAsBytes || datasetAsBytes.length === 0) {
            throw new Error(`Dataset ${datasetId} n'existe pas`);
        }
        
        const dataset = JSON.parse(datasetAsBytes.toString());
        
        // Si c'est le propriétaire, renvoyer toutes les infos
        if (dataset.orgId === requestingOrgId) {
            return datasetAsBytes.toString();
        }
        
        // Sinon, vérifier s'il y a une demande approuvée ou une collaboration active
        let hasAccess = false;
        
        // Vérifier les demandes approuvées
        const requestIterator = await ctx.stub.getStateByRange('REQUEST_', 'REQUEST_~');
        try {
            while (true) {
                const result = await requestIterator.next();
                
                if (result.value && result.value.value.toString()) {
                    const request = JSON.parse(result.value.value.toString());
                    if (request.targetDatasetId === datasetId && 
                        request.requesterOrgId === requestingOrgId && 
                        request.status === 'approved') {
                        hasAccess = true;
                        break;
                    }
                }
                
                if (result.done) {
                    await requestIterator.close();
                    break;
                }
            }
        } catch (err) {
            console.log(err);
        }
        
        // Renvoyer des infos limitées si pas d'accès complet
        if (!hasAccess) {
            return JSON.stringify({
                datasetId: dataset.datasetId,
                orgId: dataset.orgId,
                title: dataset.title,
                domain: dataset.domain,
                description: dataset.description,
                dataType: dataset.dataType,
                sizeCategory: dataset.sizeCategory,
                qualityLevel: dataset.qualityLevel,
                isAvailable: dataset.isAvailable,
                tags: dataset.tags,
                createdAt: dataset.createdAt,
                accessRestricted: true
            });
        }
        
        return datasetAsBytes.toString();
    }
    
    /**
     * Obtenir les demandes d'une organisation
     */
    async getMyRequests(ctx, orgId, requestType) {
        const requests = [];
        const iterator = await ctx.stub.getStateByRange('REQUEST_', 'REQUEST_~');
        
        try {
            while (true) {
                const result = await iterator.next();
                
                if (result.value && result.value.value.toString()) {
                    const request = JSON.parse(result.value.value.toString());
                    
                    // Filtrer selon le type de demande
                    if (requestType === 'sent' && request.requesterOrgId === orgId) {
                        requests.push(request);
                    } else if (requestType === 'received') {
                        // Vérifier si c'est pour un dataset de cette organisation
                        const datasetAsBytes = await ctx.stub.getState(`DATASET_${request.targetDatasetId}`);
                        if (datasetAsBytes && datasetAsBytes.length > 0) {
                            const dataset = JSON.parse(datasetAsBytes.toString());
                            if (dataset.orgId === orgId) {
                                requests.push(request);
                            }
                        }
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
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return JSON.stringify(requests);
    }
    
    /**
     * Obtenir les collaborations d'une organisation
     */
    async getCollaborations(ctx, orgId, status) {
        const collaborations = [];
        const iterator = await ctx.stub.getStateByRange('AGREEMENT_', 'AGREEMENT_~');
        
        try {
            while (true) {
                const result = await iterator.next();
                
                if (result.value && result.value.value.toString()) {
                    const agreement = JSON.parse(result.value.value.toString());
                    
                    // Filtrer par organisation et statut
                    if (agreement.partnerOrgs.includes(orgId)) {
                        if (!status || agreement.status === status) {
                            collaborations.push(agreement);
                        }
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
        collaborations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return JSON.stringify(collaborations);
    }
    async getCollaborationById(ctx, agreementId, status) {
        const key = `AGREEMENT_${agreementId}`;
        const collaborationBytes = await ctx.stub.getState(key);
    
        if (!collaborationBytes || collaborationBytes.length === 0) {
            return JSON.stringify({ error: 'Collaboration not found' });
        }
    
        const collaboration = JSON.parse(collaborationBytes.toString());
    
        // If status is specified, check it
        if (status && collaboration.status !== status) {
            return JSON.stringify({ error: `Collaboration exists but status does not match: expected ${status}, found ${collaboration.status}` });
        }
    
        return JSON.stringify(collaboration);
   }


    /**
     * Mettre à jour un dataset
     */
    async updateDataset(ctx, datasetId, updateInfo) {
        const update = JSON.parse(updateInfo);
        
        // Récupérer le dataset
        const datasetAsBytes = await ctx.stub.getState(`DATASET_${datasetId}`);
        if (!datasetAsBytes || datasetAsBytes.length === 0) {
            throw new Error(`Dataset ${datasetId} n'existe pas`);
        }
        
        const dataset = JSON.parse(datasetAsBytes.toString());
        
        // Vérifier que l'appelant est le propriétaire
        const clientOrgId = ctx.clientIdentity.getMSPID().replace('MSP', '').toLowerCase();
        if (clientOrgId !== dataset.orgId.toLowerCase()) {
            throw new Error(`Seul le propriétaire ${clientOrgId} peut mettre à jour le dataset`);
        }
        
        // Mettre à jour les champs autorisés
        if (update.description !== undefined) dataset.description = update.description;
        if (update.tags !== undefined) dataset.tags = update.tags;
        if (update.isAvailable !== undefined) dataset.isAvailable = update.isAvailable;
        if (update.statistics !== undefined) dataset.statistics = update.statistics;
        if (update.qualityLevel !== undefined) dataset.qualityLevel = update.qualityLevel;
        
        dataset.lastModified = this.getTxTimestamp(ctx);
        
        // Sauvegarder
        await ctx.stub.putState(`DATASET_${datasetId}`, Buffer.from(JSON.stringify(dataset)));
        
        return JSON.stringify(dataset);
    }
    
    /**
     * Obtenir les statistiques globales du système , i have to also modules,,
     */
    async getSystemStats(ctx) {
        let totalDatasets = 0;
        let totalRequests = 0;
        let totalCollaborations = 0;
        let activeCollaborations = 0;
        
        // Compter les datasets
        const datasetIterator = await ctx.stub.getStateByRange('DATASET_', 'DATASET_~');
        try {
            while (true) {
                const result = await datasetIterator.next();
                if (result.value && result.value.value.toString()) {
                    totalDatasets++;
                }
                if (result.done) {
                    await datasetIterator.close();
                    break;
                }
            }
        } catch (err) {
            console.log(err);
        }
        
        // Compter les demandes
        const requestIterator = await ctx.stub.getStateByRange('REQUEST_', 'REQUEST_~');
        try {
            while (true) {
                const result = await requestIterator.next();
                if (result.value && result.value.value.toString()) {
                    totalRequests++;
                }
                if (result.done) {
                    await requestIterator.close();
                    break;
                }
            }
        } catch (err) {
            console.log(err);
        }
        
        // Compter les collaborations
        const collabIterator = await ctx.stub.getStateByRange('AGREEMENT_', 'AGREEMENT_~');
        try {
            while (true) {
                const result = await collabIterator.next();
                if (result.value && result.value.value.toString()) {
                    totalCollaborations++;
                    const agreement = JSON.parse(result.value.value.toString());
                    if (agreement.status === 'active') {
                        activeCollaborations++;
                    }
                }
                if (result.done) {
                    await collabIterator.close();
                    break;
                }
            }
        } catch (err) {
            console.log(err);
        }
        
        return JSON.stringify({
            totalDatasets: totalDatasets,
            totalRequests: totalRequests,
            totalCollaborations: totalCollaborations,
            activeCollaborations: activeCollaborations,
            timestamp: this.getTxTimestamp(ctx)
        });
    }
    
    /**
     * Obtenir le profil d'une organisation
     */
    async getOrganizationProfile(ctx, orgId) {
        const orgAsBytes = await ctx.stub.getState(`ORG_${orgId}`);
        if (!orgAsBytes || orgAsBytes.length === 0) {
            throw new Error(`Organisation ${orgId} n'existe pas`);
        }
        
        return orgAsBytes.toString();
    }
    
    /**
     * Mettre à jour le score de réputation d'une organisation
     */
    async updateReputationScore(ctx, orgId, scoreChange, reason) {
        const orgAsBytes = await ctx.stub.getState(`ORG_${orgId}`);
        if (!orgAsBytes || orgAsBytes.length === 0) {
            throw new Error(`Organisation ${orgId} n'existe pas`);
        }
        
        const org = JSON.parse(orgAsBytes.toString());
        
        // Mettre à jour le score (garder entre 0 et 100)
        org.reputationScore = Math.max(0, Math.min(100, org.reputationScore + scoreChange));
        org.lastReputationUpdate = {
            change: scoreChange,
            reason: reason,
            timestamp: this.getTxTimestamp(ctx)
        };
        
        // Sauvegarder
        await ctx.stub.putState(`ORG_${orgId}`, Buffer.from(JSON.stringify(org)));
        
        return JSON.stringify(org);
    }
}

module.exports = DataSharingCC;

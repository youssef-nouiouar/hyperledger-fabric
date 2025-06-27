#!/bin/bash
. ./scripts/utils.sh
set -e

# successln "Starting Certificate Authorities (CAs) for the network..."
# # Démarrer la CA d'Org1
# docker-compose -f docker-compose-ca.yaml up -d ca_org1

# # Démarrer la CA d'Org2
# docker-compose -f docker-compose-ca.yaml up -d ca_org2

# # Démarrer la CA d'Org3
# docker-compose -f docker-compose-ca.yaml up -d ca_org3

# # Démarrer la CA des Orderers
# docker-compose -f docker-compose-ca.yaml up -d ca_orderer

# # Démarrer la CA de l'Orderer0
# successln "cryptomaterail generation with fabric-ca"
./registerEnroll.sh

# # Attendre que les conteneurs soient prêts
# successln "setup the network"
docker-compose -f docker-compose-net.yaml up -d


# # successln "Network started successfully"

# # successln "creating the channel"
# ./scripts/createChannel.sh 

# successln  "depley the chainecode"
# ./scripts/deployCC.sh securechannel DataSharingCC ./chaincode/data_share/ node    #// sequence 1
# ./scripts/deployCC.sh securechannel AccessControl ./chaincode/data_share/ node 
# ./scripts/deployCC.sh securechannel PrivacyManager ./chaincode/data_share/ node
# ./scripts/deployCC.sh securechannel FederatedLearningCC ./chaincode/data_share/ node    #// sequence 1
# ./scripts/deployCC.sh securechannel AnomalyDetection ./chaincode/data_share/ node
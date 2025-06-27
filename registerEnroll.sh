#!/usr/bin/env bash

# HIPAA-compliant Hyperledger Fabric Network
# Hospital A (Org1), Hospital B (Org2), Research Center (Org3), and Orderer Org

# Utility functions
function infoln() {
  echo -e "\033[0;34m${1}\033[0m"
}

function createOrg1() {
  infoln "Enrolling the CA admin for Hospital A (Org1)"
  mkdir -p organizations/peerOrganizations/org1.example.com/

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/

  set -x
  fabric-ca-client enroll -u https://admin:adminpw@localhost:7054 --caname ca-org1 --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-org1.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-org1.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-org1.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-org1.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml"

  # Configuration for organization certificates
  mkdir -p "${PWD}/organizations/peerOrganizations/org1.example.com/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/org1/ca-cert.pem" "${PWD}/organizations/peerOrganizations/org1.example.com/msp/tlscacerts/ca.crt"

  mkdir -p "${PWD}/organizations/peerOrganizations/org1.example.com/tlsca"
  cp "${PWD}/organizations/fabric-ca/org1/ca-cert.pem" "${PWD}/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem"

  mkdir -p "${PWD}/organizations/peerOrganizations/org1.example.com/ca"
  cp "${PWD}/organizations/fabric-ca/org1/ca-cert.pem" "${PWD}/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem"

  # Register peer0 and peer1 identities
  infoln "Registering peer0 for Hospital A (Primary Node)"
  set -x
  fabric-ca-client register --caname ca-org1 --id.name peer0 --id.secret peer0pw --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  infoln "Registering peer1 for Hospital A (Backup Node)"
  set -x
  fabric-ca-client register --caname ca-org1 --id.name peer1 --id.secret peer1pw --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Register user identities with different roles
  infoln "Registering user user for Hospital A"
  set -x
  fabric-ca-client register --caname ca-org1 --id.name user1 --id.secret user1pw --id.type client --id.attrs "role=user:ecert" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  infoln "Registering user user for Hospital A"
  set -x
  fabric-ca-client register --caname ca-org1 --id.name user2 --id.secret user2pw --id.type client --id.attrs "role=user:ecert" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  infoln "Registering admin for Hospital A"
  set -x
  fabric-ca-client register --caname ca-org1 --id.name org1admin --id.secret org1adminpw --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Generate MSP for peer0
  infoln "Generating the peer0 MSP for Hospital A"
  set -x
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/config.yaml"

  # Generate TLS certificates for peer0
  infoln "Generating the peer0 TLS certificates for Hospital A"
  set -x
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls" --enrollment.profile tls --csr.hosts peer0.org1.example.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Copy certificates to standard directories
  cp "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/keystore/"* "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/server.key"

  # Repeat for peer1
  infoln "Generating the peer1 MSP for Hospital A"
  set -x
  fabric-ca-client enroll -u https://peer1:peer1pw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/msp/config.yaml"

  infoln "Generating the peer1 TLS certificates for Hospital A"
  set -x
  fabric-ca-client enroll -u https://peer1:peer1pw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls" --enrollment.profile tls --csr.hosts peer1.org1.example.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/keystore/"* "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/server.key"

  # Generate MSP for user user
  infoln "Generating the user MSP for Hospital A"
  set -x
  fabric-ca-client enroll -u https://user1:user1pw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/users/user1@org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org1.example.com/users/user1@org1.example.com/msp/config.yaml"

  # Generate MSP for user user
  infoln "Generating the user MSP for Hospital A"
  set -x
  fabric-ca-client enroll -u https://user2:user2pw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/users/user2@org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org1.example.com/users/user2@org1.example.com/msp/config.yaml"

  # Generate MSP for admin
  infoln "Generating the admin MSP for Hospital A"
  set -x
  fabric-ca-client enroll -u https://org1admin:org1adminpw@localhost:7054 --caname ca-org1 -M "${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org1.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/config.yaml"
}

# Add similar modifications for createOrg2() and createOrg3()
function createOrg2() {
  infoln "Enrolling the CA admin for Hospital B (Org2)"
  mkdir -p organizations/peerOrganizations/org2.example.com/

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org2.example.com/

  set -x
  fabric-ca-client enroll -u https://admin:adminpw@localhost:8054 --caname ca-org2 --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-org2.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-org2.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-org2.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-org2.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/organizations/peerOrganizations/org2.example.com/msp/config.yaml"

  # Configuration for organization certificates
  mkdir -p "${PWD}/organizations/peerOrganizations/org2.example.com/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/org2/ca-cert.pem" "${PWD}/organizations/peerOrganizations/org2.example.com/msp/tlscacerts/ca.crt"

  mkdir -p "${PWD}/organizations/peerOrganizations/org2.example.com/tlsca"
  cp "${PWD}/organizations/fabric-ca/org2/ca-cert.pem" "${PWD}/organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem"

  mkdir -p "${PWD}/organizations/peerOrganizations/org2.example.com/ca"
  cp "${PWD}/organizations/fabric-ca/org2/ca-cert.pem" "${PWD}/organizations/peerOrganizations/org2.example.com/ca/ca.org2.example.com-cert.pem"

  # Register peer0 and peer1 identities
  infoln "Registering peer0 for Hospital B (Primary Node)"
  set -x
  fabric-ca-client register --caname ca-org2 --id.name peer0 --id.secret peer0pw --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  infoln "Registering peer1 for Hospital B (Backup Node)"
  set -x
  fabric-ca-client register --caname ca-org2 --id.name peer1 --id.secret peer1pw --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Register user identities with different roles
  infoln "Registering user user for Hospital B"
  set -x
  fabric-ca-client register --caname ca-org2 --id.name user1 --id.secret user1pw --id.type client --id.attrs "role=user:ecert" --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  infoln "Registering user user for Hospital B"
  set -x
  fabric-ca-client register --caname ca-org2 --id.name user2 --id.secret user2pw --id.type client --id.attrs "role=user:ecert" --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  infoln "Registering admin for Hospital B"
  set -x
  fabric-ca-client register --caname ca-org2 --id.name org2admin --id.secret org2adminpw --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Generate MSP for peer0
  infoln "Generating the peer0 MSP for Hospital B"
  set -x
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:8054 --caname ca-org2 -M "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org2.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/msp/config.yaml"

  # Generate TLS certificates for peer0
  infoln "Generating the peer0 TLS certificates for Hospital B"
  set -x
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:8054 --caname ca-org2 -M "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls" --enrollment.profile tls --csr.hosts peer0.org2.example.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Copy certificates to standard directories
  cp "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/keystore/"* "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/server.key"

  # Repeat for peer1
  infoln "Generating the peer1 MSP for Hospital B"
  set -x
  fabric-ca-client enroll -u https://peer1:peer1pw@localhost:8054 --caname ca-org2 -M "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org2.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/msp/config.yaml"

  infoln "Generating the peer1 TLS certificates for Hospital B"
  set -x
  fabric-ca-client enroll -u https://peer1:peer1pw@localhost:8054 --caname ca-org2 -M "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls" --enrollment.profile tls --csr.hosts peer1.org2.example.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/keystore/"* "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/server.key"

  # Generate MSP for user user
  infoln "Generating the user MSP for Hospital B"
  set -x
  fabric-ca-client enroll -u https://user1:user1pw@localhost:8054 --caname ca-org2 -M "${PWD}/organizations/peerOrganizations/org2.example.com/users/user1@org2.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org2.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org2.example.com/users/user1@org2.example.com/msp/config.yaml"

  # Generate MSP for user user
  infoln "Generating the user MSP for Hospital B"
  set -x
  fabric-ca-client enroll -u https://user2:user2pw@localhost:8054 --caname ca-org2 -M "${PWD}/organizations/peerOrganizations/org2.example.com/users/user2@org2.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org2.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org2.example.com/users/user2@org2.example.com/msp/config.yaml"

  # Generate MSP for admin
  infoln "Generating the admin MSP for Hospital B"
  set -x
  fabric-ca-client enroll -u https://org2admin:org2adminpw@localhost:8054 --caname ca-org2 -M "${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org2/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org2.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/config.yaml"
}

function createOrg3() {
  infoln "Enrolling the CA admin for Research Center (Org3)"
  mkdir -p organizations/peerOrganizations/org3.example.com/

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org3.example.com/

  set -x
  fabric-ca-client enroll -u https://admin:adminpw@localhost:9054 --caname ca-org3 --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-org3.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-org3.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-org3.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-org3.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/organizations/peerOrganizations/org3.example.com/msp/config.yaml"

  # Configuration for organization certificates
  mkdir -p "${PWD}/organizations/peerOrganizations/org3.example.com/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/org3/ca-cert.pem" "${PWD}/organizations/peerOrganizations/org3.example.com/msp/tlscacerts/ca.crt"

  mkdir -p "${PWD}/organizations/peerOrganizations/org3.example.com/tlsca"
  cp "${PWD}/organizations/fabric-ca/org3/ca-cert.pem" "${PWD}/organizations/peerOrganizations/org3.example.com/tlsca/tlsca.org3.example.com-cert.pem"

  mkdir -p "${PWD}/organizations/peerOrganizations/org3.example.com/ca"
  cp "${PWD}/organizations/fabric-ca/org3/ca-cert.pem" "${PWD}/organizations/peerOrganizations/org3.example.com/ca/ca.org3.example.com-cert.pem"

  # Register peer0 and peer1 identities
  infoln "Registering peer0 for Research Center (Primary Node)"
  set -x
  fabric-ca-client register --caname ca-org3 --id.name peer0 --id.secret peer0pw --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  infoln "Registering peer1 for Research Center (Backup Node)"
  set -x
  fabric-ca-client register --caname ca-org3 --id.name peer1 --id.secret peer1pw --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Register research user identity with limited access role
  infoln "Registering research user for Research Center (Limited Access)"
  set -x
  fabric-ca-client register --caname ca-org3 --id.name researcher1 --id.secret researcher1pw --id.type client --id.attrs "role=researcher:ecert,accessLevel=limited:ecert" --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  infoln "Registering admin for Research Center"
  set -x
  fabric-ca-client register --caname ca-org3 --id.name org3admin --id.secret org3adminpw --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Generate MSP for peer0
  infoln "Generating the peer0 MSP for Research Center"
  set -x
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:9054 --caname ca-org3 -M "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org3.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/msp/config.yaml"

  # Generate TLS certificates for peer0
  infoln "Generating the peer0 TLS certificates for Research Center"
  set -x
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:9054 --caname ca-org3 -M "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls" --enrollment.profile tls --csr.hosts peer0.org3.example.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Copy certificates to standard directories
  cp "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/keystore/"* "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/server.key"

  # Repeat for peer1
  infoln "Generating the peer1 MSP for Research Center"
  set -x
  fabric-ca-client enroll -u https://peer1:peer1pw@localhost:9054 --caname ca-org3 -M "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer1.org3.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org3.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer1.org3.example.com/msp/config.yaml"

  infoln "Generating the peer1 TLS certificates for Research Center"
  set -x
  fabric-ca-client enroll -u https://peer1:peer1pw@localhost:9054 --caname ca-org3 -M "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer1.org3.example.com/tls" --enrollment.profile tls --csr.hosts peer1.org3.example.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer1.org3.example.com/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer1.org3.example.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer1.org3.example.com/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer1.org3.example.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer1.org3.example.com/tls/keystore/"* "${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer1.org3.example.com/tls/server.key"

  # Generate MSP for researcher user (with limited access)
  infoln "Generating the researcher MSP for Research Center"
  set -x
  fabric-ca-client enroll -u https://researcher1:researcher1pw@localhost:9054 --caname ca-org3 -M "${PWD}/organizations/peerOrganizations/org3.example.com/users/Researcher1@org3.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org3.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org3.example.com/users/Researcher1@org3.example.com/msp/config.yaml"

  # Generate MSP for admin
  infoln "Generating the admin MSP for Research Center"
  set -x
  fabric-ca-client enroll -u https://org3admin:org3adminpw@localhost:9054 --caname ca-org3 -M "${PWD}/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/org3/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/org3.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/config.yaml"
}

function createOrderer() {
  infoln "Enrolling the CA admin for Orderer Organization"
  mkdir -p organizations/ordererOrganizations/example.com

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/ordererOrganizations/example.com

  set -x
  fabric-ca-client enroll -u https://admin:adminpw@localhost:10054 --caname ca-orderer --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"
  { set +x; } 2>/dev/null

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-10054-ca-orderer.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-10054-ca-orderer.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-10054-ca-orderer.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-10054-ca-orderer.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/organizations/ordererOrganizations/example.com/msp/config.yaml"

  # Configuration for orderer certificates
  mkdir -p "${PWD}/organizations/ordererOrganizations/example.com/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem" "${PWD}/organizations/ordererOrganizations/example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

  mkdir -p "${PWD}/organizations/ordererOrganizations/example.com/tlsca"
  cp "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem" "${PWD}/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem"

  # Iterate to create the 3 orderers
  for ORDERER_NAME in orderer0 orderer1 orderer2; do
    infoln "Registering ${ORDERER_NAME}"
    set -x
    fabric-ca-client register --caname ca-orderer --id.name ${ORDERER_NAME} --id.secret ${ORDERER_NAME}pw --id.type orderer --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"
    { set +x; } 2>/dev/null

    infoln "Generating the ${ORDERER_NAME} MSP"
    set -x
    fabric-ca-client enroll -u https://${ORDERER_NAME}:${ORDERER_NAME}pw@localhost:10054 --caname ca-orderer -M "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"
    { set +x; } 2>/dev/null

    cp "${PWD}/organizations/ordererOrganizations/example.com/msp/config.yaml" "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/msp/config.yaml"

    infoln "Generating the ${ORDERER_NAME} TLS certificates"
    set -x
    fabric-ca-client enroll -u https://${ORDERER_NAME}:${ORDERER_NAME}pw@localhost:10054 --caname ca-orderer -M "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/tls" --enrollment.profile tls --csr.hosts ${ORDERER_NAME}.example.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"
    { set +x; } 2>/dev/null

    # Copy certificates to standard directories
    cp "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/tls/tlscacerts/"* "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/tls/ca.crt"
    cp "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/tls/signcerts/"* "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/tls/server.crt"
    cp "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/tls/keystore/"* "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/tls/server.key"

    # Additional copies for the MSP
    mkdir -p "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/msp/tlscacerts"
    cp "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/tls/tlscacerts/"* "${PWD}/organizations/ordererOrganizations/example.com/orderers/${ORDERER_NAME}.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
  done

  # Register and generate MSP for the admin
  infoln "Registering the orderer admin"
  set -x
  fabric-ca-client register --caname ca-orderer --id.name ordererAdmin --id.secret ordererAdminpw --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"
  { set +x; } 2>/dev/null

  infoln "Generating the orderer admin MSP"
  set -x
  fabric-ca-client enroll -u https://ordererAdmin:ordererAdminpw@localhost:10054 --caname ca-orderer -M "${PWD}/organizations/ordererOrganizations/example.com/users/Admin@example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/ordererOrganizations/example.com/msp/config.yaml" "${PWD}/organizations/ordererOrganizations/example.com/users/Admin@example.com/msp/config.yaml"
}

# Main entry point of the script
infoln "Creating HIPAA-compliant certificates using Fabric CA"
createOrg1
createOrg2
createOrg3
createOrderer

infoln "Certificates generated successfully for the HIPAA-compliant Hyperledger Fabric network"
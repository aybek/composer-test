/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const { BusinessNetworkDefinition, CertificateUtil, IdCard } = require('composer-common');
const path = require('path');

require('chai').should();

const NS = 'org.acme.bank.test';

describe('BankTrade', () => {
    // In-memory card store for testing so cards are not persisted to the file system
    const cardStore = require('composer-common').NetworkCardStoreManager.getCardStore( { type: 'composer-wallet-inmemory' } );
    let adminConnection;
    let businessNetworkConnection;

    before(async () => {
        // Embedded connection used for local testing
        const connectionProfile = {
            name: 'embedded',
            'x-type': 'embedded'
        };
        // Generate certificates for use with the embedded connection
        const credentials = CertificateUtil.generate({ commonName: 'admin' });

        // PeerAdmin identity used with the admin connection to deploy business networks
        const deployerMetadata = {
            version: 1,
            userName: 'PeerAdmin',
            roles: [ 'PeerAdmin', 'ChannelAdmin' ]
        };
        const deployerCard = new IdCard(deployerMetadata, connectionProfile);
        deployerCard.setCredentials(credentials);

        const deployerCardName = 'PeerAdmin';
        adminConnection = new AdminConnection({ cardStore: cardStore });

        await adminConnection.importCard(deployerCardName, deployerCard);
        await adminConnection.connect(deployerCardName);
    });

    beforeEach(async () => {
        businessNetworkConnection = new BusinessNetworkConnection({ cardStore: cardStore });

        const adminUserName = 'admin';
        let adminCardName;
        let businessNetworkDefinition = await BusinessNetworkDefinition.fromDirectory(path.resolve(__dirname, '..'));

        // Install the Composer runtime for the new business network
        await adminConnection.install(businessNetworkDefinition);

        // Start the business network and configure an network admin identity
        const startOptions = {
            networkAdmins: [
                {
                    userName: adminUserName,
                    enrollmentSecret: 'adminpw'
                }
            ]
        };
        const adminCards = await adminConnection.start(businessNetworkDefinition.getName(), businessNetworkDefinition.getVersion(), startOptions);

        // Import the network admin identity for us to use
        adminCardName = `${adminUserName}@${businessNetworkDefinition.getName()}`;
        await adminConnection.importCard(adminCardName, adminCards.get(adminUserName));

        // Connect to the business network using the network admin identity
        await businessNetworkConnection.connect(adminCardName);
    });

    describe('#makeRequest', () => {

        it('should add the request to requestListing', async () => {

            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const seller = factory.newResource(NS, 'Trader', '111');
            seller.firstName = 'Seller';
            seller.lastName = 'Selman';

            const buyer = factory.newResource(NS, 'Trader', '222');
            buyer.firstName = 'Buyer';
            buyer.lastName = 'Buyman';

            const bank = factory.newResource(NS, 'Bank', '333');
            bank.name = 'Kazkom';
            bank.address = 'abaya 33';

            const sellerAccount = factory.newResource(NS,'BankAccount' ,'444');
            sellerAccount.owner = factory.newRelationship(NS, 'Trader', seller.$identifier);
            sellerAccount.balance = 0;

            const buyerAccount = factory.newResource(NS,'BankAccount', '555');
            buyerAccount.owner = factory.newRelationship(NS, 'Trader', buyer.$identifier);
            buyerAccount.balance = 1000;

            const product = factory.newResource(NS,'Product', '444');
            product.seller = factory.newRelationship(NS, 'Trader', seller.$identifier);
            product.sellerAccount = factory.newRelationship(NS, 'BankAccount', sellerAccount.$identifier);
            product.price = 10;

        
            const listing = factory.newResource(NS, 'RequestList', 'LISTING_001');

          
            const request = factory.newTransaction(NS, 'Request');
            request.product = factory.newRelationship(NS, 'Product', product.$identifier);
            request.buyerBankAccount = factory.newRelationship(NS, 'BankAccount',buyerAccount.$identifier);        
            request.requestList = factory.newRelationship(NS, 'RequestList', listing.$identifier);
           

            // Get the registries.
            const productRegistry = await businessNetworkConnection.getAssetRegistry(NS + '.Product');
            const requestListingRegistry = await businessNetworkConnection.getAssetRegistry(NS + '.RequestListing');
            const traderRegistry = await businessNetworkConnection.getParticipantRegistry(NS + '.Trader');
            const accountRegistry = await businessNetworkConnection.getAssetRegistry(NS + '.BankAccount');

            
            await productRegistry.add(product);

            
            await requestListingRegistry.add(listing);

    
            await traderRegistry.addAll([buyer, seller]);

    
            await bankRegistry.add(bank);
            await accountRegistry.addAll([buyerAccount,sellerAccount]);            
            await businessNetworkConnection.submitTransaction(request);

            
  
        
            let newListing = await requestListingRegistry.get(listing.$identifier);

        
            newListing.requests.length.should.equal(1);
          
           const product1 = await productRegistry.get(product.$identifier);

            
            product1.state.should.equal('BLOCKED');
   
          
        });
    });
  
    describe('#commitRequest', () => {

        it('should commit the requests in requestListing', async () => {

            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const seller = factory.newResource(NS, 'Trader', '111');
            seller.firstName = 'Seller';
            seller.lastName = 'Selman';

            const buyer = factory.newResource(NS, 'Trader', '222');
            buyer.firstName = 'Buyer';
            buyer.lastName = 'Buyman';

            const bank = factory.newResource(NS, 'Bank', '333');
            bank.name = 'Kazkom';
            bank.address = 'abaya 33';

            const sellerAccount = factory.newResource(NS,'BankAccount' ,'444');
            sellerAccount.owner = factory.newRelationship(NS, 'Trader', seller.$identifier);
            sellerAccount.balance = 0;

            const buyerAccount = factory.newResource(NS,'BankAccount', '555');
            buyerAccount.owner = factory.newRelationship(NS, 'Trader', buyer.$identifier);
            buyerAccount.balance = 1000;

            const product = factory.newResource(NS,'Product', '444');
            product.seller = factory.newRelationship(NS, 'Trader', seller.$identifier);
            product.sellerAccount = factory.newRelationship(NS, 'BankAccount', sellerAccount.$identifier);
            product.price = 200;

        
            const listing = factory.newResource(NS, 'RequestList', 'LISTING_002');

          
            const request = factory.newTransaction(NS, 'Request');
            request.product = factory.newRelationship(NS, 'Product', product.$identifier);
            request.buyerBankAccount = factory.newRelationship(NS, 'BankAccount',buyerAccount.$identifier);        
            request.requestList = factory.newRelationship(NS, 'RequestList', listing.$identifier);
        

            // Get the registries.
            const productRegistry = await businessNetworkConnection.getAssetRegistry(NS + '.Product');
            const requestListingRegistry = await businessNetworkConnection.getAssetRegistry(NS + '.RequestListing');
            const traderRegistry = await businessNetworkConnection.getParticipantRegistry(NS + '.Trader');
            const bankRegistry = await businessNetworkConnection.getParticipantRegistry(NS + '.Bank');
            const accountRegistry = await businessNetworkConnection.getAssetRegistry(NS + '.BankAccount');

            
            await productRegistry.add(product);

            
            await requestListingRegistry.add(listing);

    
            await traderRegistry.addAll([buyer, seller]);

    
            await bankRegistry.add(bank);
            await accountRegistry.addAll([buyerAccount,sellerAccount]);

            
            await businessNetworkConnection.submitTransaction(request);

            
            const req1 = factory.newTransaction(NS, 'CommitRequest');
                req1.requestList = factory.newRelationship(NS, 'RequestList', listing.$identifier);
                await businessNetworkConnection.submitTransaction(req1);

        
            let newListing = await requestListingRegistry.get(listing.$identifier);

        
            newListing.requests.length.should.equal(0);

            
            const product1 = await productRegistry.get(product.$identifier);

            
            product1.state.should.equal('SOLD');
            product1.owner.getIdentifier().should.equal(buyer.$identifier);
          

            
            const theBuyerAccount = await accountRegistry.get(buyerAccount.$identifier);
            const theSellerAccount = await accountRegistry.get(sellerAccount.$identifier);

            
            theBuyerAccount.balance.should.equal(800);

            
            theSellerAccount.balance.should.equal(200);

            
         

            
            
        });
    });
});

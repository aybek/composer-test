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

/**
* A transaction processor function description
* @param {org.acme.bank.test.Request} parameter-name A human description of the parameter
* @transaction
*/
async function makeRequest(request) {  // eslint-disable-line no-unused-vars
    let product = request.product;
    if (product.state == 'NOT_FOR_SALE') {
        throw new Error('Product is not FOR SALE');
    }
    if (product.state == 'BLOCKED') {
        throw new Error('Product is blocked buy another person');
    }

    product.state = 'BLOCKED';
    const productRegistry = await getAssetRegistry('org.acme.bank.test.Product');
    await productRegistry.update(product);

    const requestListRegistry = await getAssetRegistry('org.acme.bank.test.RequestList');
    let result = request.requestList;

    if (!result.requests) {
        result.requests = [];
    }
    result.requests.push(request);

    let requestNotification = getFactory().newEvent('org.acme.bank.test', 'RequestNotification');
    requestNotification.product = request.product;
    emit(requestNotification);
   // save the request 
    
    await requestListRegistry.update(result);

}


/**
* A transaction processor function description
* @param {org.acme.bank.test.CommitRequest} parameter-name A human description of the parameter
* @transaction
*/
async function commitRequest(commitRequest) {  // eslint-disable-line no-unused-vars
  let requestList = commitRequest.requestList; 
  const requests = requestList.requests;
  const productRegistry = await getAssetRegistry('org.acme.bank.test.Product');
  const bankAccountRegistry = await getAssetRegistry('org.acme.bank.test.BankAccount');
  const requestListRegistry = await getAssetRegistry('org.acme.bank.test.RequestList');

  const results = [];
    requests.forEach(function(request){
        let product = request.product;
        let sellerBankAccount = request.product.sellerBankAccount;
        let buyerBankAccount = request.buyerBankAccount;

        if (product.state !== 'BLOCKED'){
            throw new Error('Product was not blocked by buyer');
        }

        if (buyerBankAccount.balance >= product.price){
            buyerBankAccount.balance -= product.price;
            sellerBankAccount.balance += product.price;

            product.state = 'SOLD';
            product.owner = buyerBankAccount.owner;
            
             results.push(productRegistry.update(product));
             results.push(bankAccountRegistry.update(buyerBankAccount));
             results.push(bankAccountRegistry.update(sellerBankAccount));
          
            
        } else {
           
            product.state = 'FOR_SALE';
            results.push(productRegistry.update(product));
           
            let commitFailedNotification = getFactory().newEvent('org.acme.bank.test', 'CommitFailedNotification');
            commitFailedNotification.product = product;
            commitFailedNotification.message = 'Buyer has not sufficient funds';
            emit(commitFailedNotification);
    
        }
    });
   await Promise.all(results)

  requestList.requests = [];
  await requestListRegistry.update(requestList);  
}

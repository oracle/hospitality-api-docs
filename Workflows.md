# Oracle Hospitality OPERA Cloud Rest APIs Commonly Used Work Flows

To help our partners and customers we have put together a &#39;cheat-sheet&#39; to help guide you and suggest which APIs to use. There are over 3000 API&#39;s available, and you&#39;re welcome to use any of them, however we hope this document will give you a head start and good suggestions to cover common business scenarios for hotels.

## License

You may not use the identified files except in compliance with the Universal Permissive License (UPL), Version 1.0 (the "License.")\

You may obtain a copy of the License at
<https://opensource.org/licenses/UPL>.  A copy of the license is
also reproduced below.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied.

See the License for the specific language governing permissions and
limitations under the License.

## Common Work flows covered in this document

1. Search Availability and make a reservation
2. Check in a guest
3. Offer an upgrade
4. In House guest
5. Check out a guest

### 1. Search Availability and make a Reservation

Flow:

1. Search for Property Availability
2. Get Rate Plan Information
3. Get Packages and/or Inventory Items
4. Get Cancel, Deposit &amp; Guarantee Policies
5. Get Payment Methods
6. Create Reservation

| **Business case** | **Rest api** | **Module** |
| --- | --- | --- |
| **Search Availability**** for a property**. This API is used to request availability at a property, showing you the room types and rate plans that are available. With the response, you can choose which rate code &amp; room type combination you wish to make a booking for, and use these room type code and rate plan codes in the postReservation request. | getHotelAvailability | Availability (PAR) |
| **Get Rate Plan Information** – specify the Rate Plan Code in the path to retrieve more details about the rate plan, such as the Rate Long Description, commission and market code. | getRatePlan | Rates (RTP) |
| **Get available Packages**. Often a guest want to &#39;add-on&#39; to their reservation, and add extras such as buffet breakfast, or a box of chocolates. Use this API to find the available packages and their price. You can then use the package codes in either post or putReservation to add these packages to a reservation. | getPackages | Rates (RTP) |
| **Get Guarantee Policies** – these policies can be used to display to a guest, to see how they will guarantee their booking. A hotel might allow a 6PM policy, which might not require a credit card, or they might only allow a Guarantee to CC policy. | getGuaranteePolicies | Availability (PAR) |
| **Get Payment Methods** – this will return available Payment Methods for a hotel, such as CASH, VISA, AMEX. You will need these codes to use in the postReservation request. | getPaymentMethods | List Of Values (LOV) |
| **Get existing guest profile**. During the process of making a reservation you can create a new profile (i.e. within a postReservation) OR you can use an existing profile. <br /> This would be the case if a guest has already stayed at the property and therefore search for an existing profile using getProfiles. The response will contain the profile Id, which you can then include within the body of the postReservation. | getProfilesgetProfile | Customer Relationship Management (CRM) |
| **Create new reservation –** now that you know the rate plan code, room type, payment methods etc, you can go ahead and postReservation. In the response, you will see the &#39;location header&#39; – this contains the reservation Id. You can use this reservation Id to update a reservation. | postReservation | Reservations (RSV) |
| **Update reservation** – add packages, comments, change details of the stay. So much can be used for this operation, you will need to know the reservation id for the path. | putReservation | Reservations (RSV) |

### 2. Check in a Guest

Flow:

1. Find your Reservation
2. Split reservation if 2 or more rooms
3. Pre-Register Guest
4. Search Available &amp; Inspected Rooms
5. Assign a Room
6. Check In a Guest

| **Business case** | **Rest api** | **Module** |
| --- | --- | --- |
| **Search for an existing Reservation** using available parameters. You can search by first name, last name, arrival date, reservation status and many more parameters. The response message will have all reservations returned that match your search criteria. Once you know the specific reservation ID for the right booking, proceed to next step – getReservation. | getReservations | Reservations (RSV) |
| **Retrieve a reservation&#39;s details** by specifying the Reservation Id in the request. This will return greater details for the reservation, depending upon your fetchInstructions in the request. The reservation will need to be in &quot;Due-In&quot; status in order to check-in. | getReservation | Reservations (RSV) |
| **Split Reservations**. A common scenario is a reservation for 2 or more rooms. In order to be able to check in a guest, the reservation needs to be for 1 room only (to be able to assign a physical room). If you have a reservation for 2 rooms, perform the **putSplitMultiRoomReservation API**. This will essentially create a new reservation for the second room, and the &#39;new&#39; reservation will automatically be linked to the initial reservation. You can use the **getLinkedSummary** API to find details of the new reservation. Then walk through the following steps to assign rooms to both reservations and check them in. | putSplitMultiRoomReservation <br /> getLinkedSummary | Reservations (RSV) |
| If a guest needs to **update their Reservation** with new Payment methods, use this API. | putReservation | Reservations (RSV) |
| **Update a profile** - depending upon what information exists on a guest profile, you may need to add more details, such as passport information, preferences, update address or email etc. Use the putProfile operation to add this data to the existing profile. Note – you will have received the guest&#39;s profile ID in the getReservation response | putProfile | Customer Relationship Management (CRM) |
| You can offer your guests the ability to check in for their reservations by **pre-registering**. When a reservation is pre-registered, all of the guest&#39;s information to finish the registration process is collected, including authorizing the guest&#39;s credit card for the reservation. This makes it easy to check in the reservation when the guests arrive and the assigned room is available. <br /> Note – this is dependent upon individual Hotel Configuration – pre-register rules. | postPreCheckIn | Reservations (RSV) |
| **Search for available, clean rooms** to assign to a reservation. We suggest that you always search with the following parameters: <ul><li> hotelRoomStatus=Inspected</li><li>hotelRoomFrontOfficeStatus=Vacant</li></ul> | getRooms | Front Office (FOF) |
| **Assign a room number** to the reservation. | postRoomsAssignments | Front Office (FOF) |
| **Check in a Guest** | postCheckIn | Front Office (FOF) |
| **Cancel (revert) a checked-in guest.** This will revert the status of the reservation to &quot;due-in&quot;. | deleteCheckIns | Front Office (FOF) |

### 3. Offer the Guest an Upgrade

Flow:

1. getAvailableUpsells
2. postUpsell
3. getUpsell
4. deleteUpsell

| **Business case** | **Rest api** | **Module** |
| --- | --- | --- |
| **Search to see if there is an available upgrade offer.** Only if there are offers available can you then present these to the guest. <br /> Note - you cannot upgrade reservations under the following conditions - the reservation status is Checked In, Cancelled, No Show, or Waitlist, a shared reservation, or a fixed rate reservation. | getAvailableUpsells | Availability (PAR) |
| Use this API to **add the upsell offer** to a guest&#39;s reservation. You will need to know the upsell offer code, which you will get in the getUpsells response message. | postUpsells | Reservations (RSV) |
| If you wish to **remove an upsell offer from a reservation** , use this API. | deleteUpsells | Reservations (RSV) |
| If you want to check if a reservation has an upgrade on it, **use getUpsell** operation using the reservation id in the request. | getUpsell | Reservations (RSV) |

| **Configuration of Upsell Rules** | **Rest api** | **Module** |
| --- | --- | --- |
| Configure and add **a new upsell rule** for a property. You can add rules on room type level, or room class level. | postUpsellRule | Reservations Configuration (RSV/Config) |
| **Update an existing upsell rule** | putUpsellRule | Reservations Configuration (RSV/Config) |
| **Remove an upsell Rule**. This will completely delete the rule, and no longer be available to use/sell. | deleteUpsellRule | Reservations Configuration (RSV/Config) |
| **Test an upsell rule**. In the Body of this request you can add rates, room type and test to see if a rule will be returned. | testUpsellRule | Reservations Configuration (RSV/Config) |
| **Get all configured upsell rules** for a property. | getUpsellRules | Reservations Configuration (RSV/Config) |

### 4. In House Guest

| **Business case** | **Rest api** | **Module** |
| --- | --- | --- |
| **getGuestMessages** - You can maintain an unlimited number of messages on a reservation, mark the messages as received or not received. Use **getMessages** to retrieve any messages that are on a guest&#39;s reservation. | getGuestMessages | Reservations (RSV) |
| **postBillingCharges.** Use this operation to add a charge to a guest&#39;s folio, for example a guest may consume a chocolate from the mini bar in room. You will need to perform **getTransactionCodes** first, to then know the relevant data for postBillingCharges. | postBillingCharges <br /> getTransactionCodes | Cashiering (CSH) |
| **Extend your stay**.Should a guest want to extend their stay, you can use **putReservation** to update their booking. | putReservation | Reservations (RSV) |
| Log a **service request** – for example the TV is not working, you can log this as a service request using the **postServiceRequests** operation.You could also use:<ul><li>getServiceRequest, to view any existing requests on a reservation</li><li>putServiceRequests, to update a request</li><li>deleteServiceRequests. to remove a request from a reservation.</li></ul> | postServiceRequests | Front Office (FOF) |

### 5. Check out a Guest

Flow:

1. Retrieve Reservation
2. get Folio details
3. post billing charge
4. post billing payment
5. Check Out Guest

| **Business case** | **Rest api** | **Module** |
| --- | --- | --- |
| **Retrieve a reservation –** if you know the reservation Id use getReservation. If you need to search for a reservation with names, room number, arrival date, etc use getReservations. | getReservationsgetReservation | Reservations (RSV) |
| **Get the folio details**. This will return you information on the guests account (folio) and will advise the charges, payments and outstanding balances. | getFolios | Cashiering (CSH) |
| **Post a charge** to a guest&#39;s reservation/folio. For example a guest had chips from the mini bar, you can add this charge to their folio.
 In order to know the charges that can be posted, use **getTransactionCodes** operation. | postBillingCharges <br /> getTransactionCodes | Cashiering (CSH) |
| **Post a payment** to the folio. From the folio details you will be able to see the balance for the guest&#39;s stay. You can post a payment to the folio using this operation to bring the balance to $0. | postBillingPayments | Cashiering (CSH) |
| **Generate Folio Number.** This operation is required once you have brought the folio balance to $0 and is used to generate the folio number and/or bill number. Use postFolios to perform this action. | postFolios | Cashiering (CSH) |
| **Check out a reservation**. Typically you will only be able to check out a guest if their folio balance is $0. | postCheckOuts | Cashiering (CSH) |
 
Copyright © 2021, Oracle and/or its affiliates. All rights reserved. This document is provided for information purposes only, and the contents hereof are subject to change without notice. This document is not warranted to be error-free, nor subject to any other warranties or conditions, whether expressed orally or implied in law, including implied warranties and conditions of merchantability or fitness for a particular purpose. We specifically disclaim any liability with respect to this document, and no contractual obligations are formed either directly or indirectly by this document. This document may not be reproduced or transmitted in any form or by any means, electronic or mechanical, for any purpose, without our prior written permission.This device has not been authorized as required by the rules of the Federal Communications Commission. This device is not, and may not be, offered for sale or lease, or sold or leased, until authorization is obtained.

Oracle and Java are registered trademarks of Oracle and/or its affiliates. Other names may be trademarks of their respective owners.Intel and Intel Xeon are trademarks or registered trademarks of Intel Corporation. All SPARC trademarks are used under license and are trademarks or registered trademarks of SPARC International, Inc. AMD, Opteron, the AMD logo, and the AMD Opteron logo are trademarks or registered trademarks of Advanced Micro Devices. UNIX is a registered trademark of The Open Group. 0120Disclaimer: If you are unsure whether your data sheet needs a disclaimer, read the revenue recognition policy. If you have further questions about your content and the disclaimer requirements, e-mail [REVREC\_US@oracle.com](mailto:REVREC_US@oracle.com).
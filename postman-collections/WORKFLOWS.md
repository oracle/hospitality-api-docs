# Oracle Hospitality OPERA Cloud Rest APIs Commonly Used Work Flows

To help our partners and customers we have put together a 'cheat-sheet' to help guide you and suggest which APIs to use. There are over 3000 APIs available, and you're welcome to use any of them, however we hope this document will give you a head start and good suggestions to cover common business scenarios for hotels.

For a great walkthrough of these workflows register to watch this on demand video [Live Demonstration of Contactless APIs](https://videohub.oracle.com/media/Oracle+Hospitality+Innovation+WeekA+Live+Demonstration+of+Contactless+APIs/1_ujwqu9rd).

Note that some of these APIs are v0 - these are our Early Adopter APIs.  To find out what these are and how to get access to these register to watch this on demand video [Why be an OHIP Early Adopter](https://go.oracle.com/LP=105035?elqCampaignId=281803&src1=:ow:o:p:po:::&intcmp=BUMK201218P00049:ow:o:p:po).

The following common workflows are covered in this document:

[1. Search Availability and make a Reservation](#1-search-availability-and-make-a-reservation)

[2. Check in a Guest](#2-check-in-a-guest)

[3. Upsell a Reservation](#3-upsell-a-reservation)

[4. In House Guest](#4-in-house-guest)

[5. Check out a Guest](#5-check-out-a-guest)

## 1. Check Availability and book a Reservation

Flow:

1. Search for Hotel Availability
2. Get Rate Plan Information
3. Get Packages and/or Inventory Items
4. Get Cancel, Deposit& Guarantee Policies
5. Get Payment Methods
6. Create Reservation

| **Business case** | **Rest api** | **Module** |
| --- | --- | --- |
| **Search Availability** for a property. This API is used to request availability at a property, showing you the room types and rate plans that are available. With the response, you can choose which rate code & room type combination you wish to make a booking for, and use these room type code and rate plan codes in the `postReservation` request. | getHotelAvailability | Availability (PAR) |
| **Get Rate Plan Information** – specify the Rate Plan Code in the path to retrieve more details about the rate plan, such as the Rate Long Description, commission and market code. | getRatePlan | Rates (RTP) |
| **Get available Packages**. Often a guest wants to 'add-on' to their reservation, and add extras such as buffet breakfast, or a box of chocolates. Use this API to find the available packages and their price. You can then use the package codes in either `postReservation` or `putReservation` to add these packages to a reservation. | getPackages | Rates (RTP) |
| **Get Guarantee Policies** – these policies can be used to display to a guest, to see how they will guarantee their booking. A hotel might allow a 6PM policy, which might not require a credit card, or they might only allow a Guarantee to CC policy. | getGuaranteePolicies | Availability (PAR) |
| **Get Payment Methods** – this will return available Payment Methods for a hotel, such as CASH, VISA, AMEX. You will need these codes to use in the `postReservation` request. | getPaymentMethods | List Of Values (LOV) |
| **Get existing guest profile**. During the process of making a reservation you can create a new profile (i.e. within a `postReservation`) OR you can use an existing profile. This would be the case if a guest has already stayed at the property and therefore search for an existing profile using getProfiles. The response will contain the profile Id, which you can then include within the body of the postReservation. | getProfiles getProfile | Customer Relationship Management (CRM) |
| **Create new reservation** – Now that you know the rate plan code, room type, payment methods, etc, you can go ahead and postReservation. In the response, you will see the `location` header – this contains the reservation Id. You can use this reservation Id to update a reservation. | postReservation | Reservations (RSV) |
| **Update reservation** – add packages, comments, change details of the stay. So much can be used for this operation, you will need to know the reservation id for the path. | putReservation | Reservations (RSV) |

## 2. Check in a Guest

Flow:

1. Find your Reservation
2. Split reservation if 2 or more rooms
3. Pre-Register Guest
4. Search Available& Inspected Rooms
5. Assign a Room
6. Check In a Guest

| **Business case** | **Rest api** | **Module** |
| --- | --- | --- |
| **Search for an existing Reservation** using available parameters. You can search by first name, last name, arrival date, reservation status and many more parameters. The response message will have all reservations returned that match your search criteria. Once you know the specific reservation ID for the right booking, proceed to next step – `getReservation`. | getReservations | Reservations (RSV) |
| **Retrieve a reservation's details** by specifying the Reservation Id in the request. This will return greater details for the reservation, depending upon your `fetchInstructions` query parameter. The reservation will need to be in "Due-In" status in order to check-in. | getReservation | Reservations (RSV) |
| **Split Reservations**. A common scenario is a reservation for 2 or more rooms. In order to be able to check in a guest, the reservation needs to be for 1 room only (to be able to assign a physical room). If you have a reservation for 2 rooms, perform the **putSplitMultiRoomReservation API**. This will essentially create a new reservation for the second room, and the 'new' reservation will automatically be linked to the initial reservation. You can use the **getLinkedSummary** API to find details of the new reservation. Then walk through the following steps to assign rooms to both reservations and check them in. | putSplitMultiRoomReservation getLinkedSummary | Reservations (RSV) |
| If a guest needs to **update their Reservation** with new Payment methods, use this API. | putReservation | Reservations (RSV) |
| **Update a profile** - depending upon what information exists on a guest profile, you may need to add more details, such as passport information, preferences, update address or email etc. Use the `putProfile` operation to add this data to the existing profile. Note – you will have received the guest's profile ID in the `getReservation` response | putProfile | Customer Relationship Management (CRM) |
| You can offer your guests the ability to check in for their reservations by **pre-registering**. When a reservation is pre-registered, all of the guest's information to finish the registration process is collected, including authorizing the guest's credit card for the reservation. This makes it easy to check in the reservation when the guests arrive and the assigned room is available. Note – this is dependent upon individual Hotel Configuration – pre-register rules. | postPreCheckIn | Reservations (RSV) |
| **Search for available, clean rooms** to assign to a reservation. We suggest that you always search with the following parameters: `hotelRoomStatus=Inspected` and `hotelRoomFrontOfficeStatus=Vacant` | getRooms | Front Office (FOF) |
| **Assign a room number** to the reservation. | postRoomsAssignments | Front Office (FOF) |
| **Check in a Guest** | postCheckIn | Front Office (FOF) |
| **Cancel (revert) a checked-in guest.** This will revert the status of the reservation to "Due-In". | deleteCheckIns | Front Office (FOF) |

## 3. Upsell a Reservation

Offer the guest an upgrade.

Flow:

1. getAvailableUpsells
2. postUpsell
3. getUpsell
4. deleteUpsell

| **Business case** | **Rest api** | **Module** |
| --- | --- | --- |
| **Search to see if there is an available upgrade offer.** Only if there are offers available can you then present these to the guest. Note - you cannot upgrade reservations under the following conditions - the reservation status is Checked In, Cancelled, No Show, or Waitlist, a shared reservation, or a fixed rate reservation. | getAvailableUpsells | Availability (PAR) |
| Use this API to **add the upsell offer** to a guest's reservation. You will need to know the upsell offer code, which you will get in the `getUpsells` response message. | postUpsells | Reservations (RSV) |
| If you wish to **remove an upsell offer from a reservation** , use this API. | deleteUpsells | Reservations (RSV) |
| If you want to check if a reservation has an upgrade on it, **use getUpsell** operation using the reservation id in the request. | getUpsell | Reservations (RSV) |

| **Configuration of Upsell Rules** | **Rest api** | **Module** |
| --- | --- | --- |
| Configure and add **a new upsell rule** for a property. You can add rules on room type level, or room class level. | postUpsellRule | Reservations Configuration (RSV/Config) |
| **Update an existing upsell rule** | putUpsellRule | Reservations Configuration (RSV/Config) |
| **Remove an upsell Rule**. This will completely delete the rule, and no longer be available to use/sell. | deleteUpsellRule | Reservations Configuration (RSV/Config) |
| **Test an upsell rule**. In the Body of this request you can add rates, room type and test to see if a rule will be returned. | testUpsellRule | Reservations Configuration (RSV/Config) |
| **Get all configured upsell rules** for a property. | getUpsellRules | Reservations Configuration (RSV/Config) |

## 4. In House Guest

| **Business case** | **Rest api** | **Module** |
| --- | --- | --- |
| **getGuestMessages** - You can maintain an unlimited number of messages on a reservation, mark the messages as received or not received. Use **getMessages** to retrieve any messages that are on a guest's reservation. | getGuestMessages | Reservations (RSV) |
| **postBillingCharges.** Use this operation to add a charge to a guest's folio, for example a guest may consume a chocolate from the mini bar in room. You will need to perform **getTransactionCodes** first, to then know the relevant data for postBillingCharges. | postBillingCharges, getTransactionCodes | Cashiering (CSH) |
| Log a **service request** – for example the TV is not working, you can log this as a service request using the **postServiceRequests** operation.You could also use: `getServiceRequest` to view any existing requests on a reservation, `putServiceRequests` to update a request and `deleteServiceRequests` to remove a request from a reservation | postServiceRequests | Front Office (FOF) |

## 5. Check out a Guest

Flow:

1. Retrieve Reservation
2. get Folio details
3. post billing charge
4. post billing payment
5. Check Out Guest

| **Business case** | **Rest api** | **Module** |
| --- | --- | --- |
| **Retrieve a reservation –** if you know the reservation Id use getReservation. If you need to search for a reservation with names, room number, arrival date, etc use `getReservations`. | getReservations getReservation | Reservations (RSV) |
| **Get the folio details**. This will return you information on the guests account (folio) and will advise the charges, payments and outstanding balances. | getFolios | Cashiering (CSH) |
| **Post a charge** to a guest's reservation/folio. For example a guest had chips from the mini bar, you can add this charge to their folio.  In order to know the charges that can be posted, use `getTransactionCodes` operation. | postBillingCharges getTransactionCodes | Cashiering (CSH) |
| **Post a payment** to the folio. From the folio details you will be able to see the balance for the guest's stay. You can post a payment to the folio using this operation to bring the balance to $0. | postBillingPayments | Cashiering (CSH) |
| **Generate Folio Number.** This operation is required once you have brought the folio balance to $0 and is used to generate the folio number and/or bill number. Use postFolios to perform this action. | postFolios | Cashiering (CSH) |
| **Check out a reservation**. Typically you will only be able to check out a guest if their folio balance is $0. | postCheckOuts | Cashiering (CSH) |

## Get Help

Ask questions on by sending us an email to <hospitality_apis_ww_group@oracle.com>.

## Get Involved

- Learn how to [contribute](../CONTRIBUTING.md)
- See [issues](https://github.com/oracle/hospitality-api-docs/issues) for issues you can help with.

## Reporting Security Vulnerabilities

Please do NOT raise a GitHub Issue to report a security vulnerability. Refer to [SECURITY](../SECURITY.md) for details on how to report security vulnerabilities.

## License

This project and all content within is available under the [Universal Permissive License v 1.0](http://oss.oracle.com/licenses/upl).

See [LICENSE](../LICENSE.txt) for more details.

## Copyright

Copyright c 2021 Oracle and/or its affiliates.

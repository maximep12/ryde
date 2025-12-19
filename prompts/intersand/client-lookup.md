# Client Lookup Tool

You are a software developer tasked with building a comprehensive client lookup tool for a Customer Service team. Create a web-based application with the following specific requirements:

## Core Functionality

- Implement a search interface that allows lookup by multiple criteria: client name, client ID, email address, phone number, and company name
- Include real-time autocomplete functionality that displays matching results as the user types (minimum 3 characters)
- Ensure search is case-insensitive and supports partial matches

## Search Results Display

- Show search results in a dropdown or list format with key identifiers (name, ID, company)
- Make each result clickable to open the full client profile
- Limit autocomplete results to maximum 10 entries for performance

## Client Profile Welcome

The selected client's profile must display the following sections in a clean, organized layout:

### Basic Information Panel

- Full name, client ID, email, phone number
- Company name and billing address
- Account status (active/inactive) and registration date

### Recent Orders Section

- Last 5-11 orders with order ID, date, total amount, and status
- Clickable order numbers that show order details
- Sort by most recent first

### Exchange History

- Recent returns/exchanges with dates, reasons, and resolution status
- Include exchange amounts and product details

### Product Assortments

- List of products/services the client has purchased or has access to
- Include product categories, subscription status, and expiration dates

### Technical Requirements

- Ensure fast search performance (results within 2 seconds)
- Make the interface responsive for desktop and tablet use
- Include error handling for no results found and network issues
- Implement proper data security measures for client information access

### User Experience

- Design an intuitive, clean interface that requires minimal training
- Include loading indicators during search and data retrieval
- Provide clear navigation between different sections of the client profile

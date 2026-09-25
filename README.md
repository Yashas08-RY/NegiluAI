# 🌾 NegiluAI

### AI-Powered Agricultural Marketplace and Rural Supply Chain Platform

NegiluAI is an AI-powered agricultural marketplace designed to connect farmers and Farmer Producer Organizations (FPOs) directly with consumers, retailers, and bulk buyers.

The platform focuses on reducing unnecessary intermediaries, improving market access for farmers, forecasting crop prices and demand, and making fresh-produce transportation more efficient.

---

## 🚜 Problem

Farmers often depend on multiple intermediaries to reach the final buyer. This can reduce their share of the final selling price and limit their access to wider markets.

At the same time, farmers face uncertainty about:

- Future crop prices
- Market demand
- When to harvest and sell
- Finding suitable buyers
- Transportation of fresh produce

Scattered transportation can also increase delivery time, cost, and the risk of produce losses.

---

## 💡 Our Solution

NegiluAI brings **marketplace, market intelligence, and smart logistics** together in a single platform.

### 1. 🛒 Direct Farm-to-Buyer Marketplace

Farmers and FPOs can list their available produce and connect directly with:

- Consumers
- Retailers
- Bulk buyers

This reduces unnecessary intermediary dependency and improves direct market access.

### 2. 📈 Price & Demand Forecasting

NegiluAI uses historical market data and machine learning to forecast:

- Crop prices
- Future demand
- Possible demand patterns

The proposed forecasting pipeline uses **Prophet and XGBoost** to help farmers make better harvesting and selling decisions.

### 3. 🚚 Dynamic Route Optimization

Fresh produce needs to reach buyers quickly and efficiently.

NegiluAI uses **Google OR-Tools** to optimize multi-stop delivery routes by considering nearby farms, buyer orders, and delivery requirements.

The goal is to reduce unnecessary travel and improve the movement of perishable produce.

---

## 🔄 How NegiluAI Works

```text
Farmer / FPO
      ↓
List Available Produce
      ↓
NegiluAI Marketplace
      ↓
Buyer Matching
      ↓
Demand & Price Forecasting
      ↓
Order Confirmation
      ↓
Route Optimization
      ↓
Efficient Farm Pickup
      ↓
Buyer Delivery

Technology Stack

| Layer                      | Technology                |
| -------------------------- | ------------------------- |
| Frontend                   | React.js                  |
| Application Type           | Progressive Web App (PWA) |
| Backend                    | FastAPI                   |
| Database                   | PostgreSQL                |
| Geospatial Data            | PostGIS                   |
| Price & Demand Forecasting | Prophet, XGBoost          |
| Route Optimization         | Google OR-Tools           |
| Containerization           | Docker                    |
| Deployment                 | Cloud Infrastructure      |

System Architecture:
                    ┌──────────────────────┐
                    │     React.js PWA     │
                    │ Farmer / Buyer App   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │       FastAPI        │
                    │    Backend APIs      │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
        ┌────────────┐ ┌────────────┐ ┌──────────────┐
        │ PostgreSQL │ │  Prophet + │ │ Google       │
        │ + PostGIS  │ │  XGBoost   │ │ OR-Tools     │
        └────────────┘ └────────────┘ └──────────────┘
                │              │              │
                ▼              ▼              ▼
          Marketplace     Forecasting      Smart Routes

🎯 What Makes NegiluAI Different?
Most agricultural platforms focus mainly on buying and selling.

NegiluAI combines three connected components:
       MARKET ACCESS
             +
      MARKET INTELLIGENCE
             +
       SMART LOGISTICS
             ↓
       NEGILUAI

       🌱 Expected Impact
Farmers & FPOs:
Better access to potential buyers
More direct selling opportunities
Better information about price and demand
Improved planning of harvest and sales
Consumers & Buyers:
More direct sourcing from farmers
Better visibility of available produce
Efficient order fulfillment
Logistics:
Better utilization of delivery routes
Reduced unnecessary travel
Faster movement of fresh produce
Supply Chain:
Reduced dependency on unnecessary intermediary layers
Better coordination between supply, demand, and transportation
Reduced avoidable produce wastage


🔮Future Scope
Future development can include:
Local-language and voice-based farmer assistance
Improved demand forecasting using additional market signals
Real-time route updates
Integration with additional agricultural data sources
Wider FPO and buyer onboarding
Advanced freshness-aware logistics
More detailed farmer analytics

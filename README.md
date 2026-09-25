# NegiluAI — AI-Powered Agri-Marketplace

**Smart Market Linkages, APMC Price Discovery & Perishable Logistics for Farmers & FPOs**

[![SIH 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://sih.gov.in)
[![Problem Statement ID](https://img.shields.io/badge/PS_ID-26132-blue.svg)](https://sih.gov.in)
[![Organization](https://img.shields.io/badge/Govt_of-Maharashtra-red.svg)](https://www.maharashtra.gov.in)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Developed by **Team RecursiX** (Team ID: 166945) for **Smart India Hackathon 2026**.  
**Problem Statement 26132:** *Strengthening market linkages and price discovery for farmers* (Issued by Government of Maharashtra / MSInS).

---

## 📌 Overview

**NegiluAI** is an integrated, end-to-end digital marketplace designed to connect Farmer Producer Organizations (FPOs) across Maharashtra directly with verified institutional buyers, supermarket chains, and food processors. 

Smallholder farmers often face opaque APMC mandi pricing, urgent liquidity constraints, and high post-harvest transit losses. NegiluAI solves these challenges by combining **AI-driven price discovery**, **Agmark digital lot grading**, **shelf-life-aware route optimization**, and **escrow payment protection** into a simple, voice-guided Progressive Web App (PWA) built for rural mobile networks.

---

## ✨ Key Features

1. **APMC Price Discovery & Sale-Window Alerts:**
   * Uses time-series machine learning models (**Meta Prophet** & **XGBoost**) trained on daily mandi arrival data to forecast 7-day price corridors.
   * Sends proactive alerts to farmers recommending the optimal days to harvest and sell to prevent distress sales.

2. **Agmark Digital Lotting & Quality Grading:**
   * Standardizes harvest batches at local FPO collection hubs into **Grade A** (Retail/Q-Commerce) and **Grade B** (Food Processors).
   * Eliminates destination quality rejections and pricing disputes between buyers and sellers.

3. **Perishable-Aware Route Optimization:**
   * Powered by **Google OR-Tools** (Vehicle Routing Problem) and **PostGIS** spatial mapping.
   * Clusters multi-farm pickups into shared trucks and prioritizes dispatch based on crop perishability limits to prevent rot in transit.

4. **Escrow Payments & Batch Reservation:**
   * Integrates **Razorpay Escrow** to lock buyer funds upon order placement, releasing payments automatically upon digital Proof-of-Delivery (POD) and quality acceptance.
   * Uses **Redis distributed locking** to prevent double-selling of high-demand crop batches during peak buyer checkouts.

5. **Multilingual Voice Navigation:**
   * Built as a lightweight React PWA featuring **Bhashini voice support** in Marathi and Hindi for seamless operation in low-bandwidth rural areas.

---

## 🛠️ Technology Stack

| Component | Technology / Framework |
| :--- | :--- |
| **Frontend** | React.js (PWA), Bhashini Voice Integration (Marathi/Hindi), Tailwind CSS |
| **Backend API** | FastAPI (Python Async) |
| **Database & GIS** | PostgreSQL + PostGIS (Farm Plot Geofencing & Mandi Proximity) |
| **Concurrency Caching** | Redis Cache (Batch Locks) |
| **Machine Learning** | Meta Prophet, XGBoost, Scikit-Learn, Pandas |
| **Logistics Solver** | Google OR-Tools (Capacitated Vehicle Routing with Time Windows) |
| **Payments & Auth** | Razorpay Escrow API, JWT Authentication |
| **Containerization** | Docker & Cloud Infrastructure |

---

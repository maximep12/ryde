# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The Franklin Project

This app is built upon The Franklin Project, an in-house initiative that acts as a starter kit for the agency and a way to quickly leverage LLMs to produce disposables prototypes than can be easily turned into real apps.

## Objective

Provide a way to quickly kick off a prototype or a new app with as little friction as possible, while following V7 standards, both technically and in terms of structure and formality.

The project aims to be as "LLM-friendly" as possible in order to greatly facilitate the work of Claude Code as a UI prototype generator.

It is essential to maintain this repository over time. It is also crucial to refine it and keep it up to date based on learnings and reflections within the company.

## Data Structure and Seed

Whenever there are changes to data structures (changes in the db or redis package), let's make sure the seed data is adjusted accordingly in both directories if there are any.

## MCP Servers

This project includes three MCP (Model Context Protocol) servers configured in `.mcp.json`:

### context7

Provides up-to-date, version-specific documentation for libraries. Add "use context7" to your prompt to fetch current official documentation and code examples.

### postgres

Read-only access to the PostgreSQL database. Use this to inspect schemas and run read-only queries.

### browser (Puppeteer)

Browser automation capabilities. Use this to take screenshots, navigate web pages, and interact with elements in a real browser environment.

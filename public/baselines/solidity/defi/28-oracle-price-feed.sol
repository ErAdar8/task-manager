// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Oracle Price Feed
 * @notice BASELINE: Chainlink-style price oracle
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true
 * - Tags: ["oracle", "price-feed", "chainlink"]
 */
contract OraclePriceFeed {
    address public owner;

    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 roundId;
    }

    mapping(uint256 => PriceData) public priceHistory;
    uint256 public latestRound;

    uint256 public constant STALE_PRICE_DELAY = 1 hours;

    event PriceUpdated(uint256 indexed roundId, uint256 price, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Update price (in production, this would be done by Chainlink nodes)
     */
    function updatePrice(uint256 newPrice) public onlyOwner {
        require(newPrice > 0, "Price must be > 0");

        latestRound++;

        priceHistory[latestRound] = PriceData({
            price: newPrice,
            timestamp: block.timestamp,
            roundId: latestRound
        });

        emit PriceUpdated(latestRound, newPrice, block.timestamp);
    }

    /**
     * @notice Get latest price with staleness check
     */
    function getLatestPrice() public view returns (uint256 price, uint256 timestamp) {
        require(latestRound > 0, "No price data");

        PriceData memory data = priceHistory[latestRound];

        require(
            block.timestamp - data.timestamp <= STALE_PRICE_DELAY,
            "Price data is stale"
        );

        return (data.price, data.timestamp);
    }

    /**
     * @notice Get price at specific round
     */
    function getPriceAtRound(uint256 roundId) public view returns (uint256 price, uint256 timestamp) {
        require(roundId > 0 && roundId <= latestRound, "Invalid round");

        PriceData memory data = priceHistory[roundId];
        return (data.price, data.timestamp);
    }

    /**
     * @notice Calculate TWAP (Time-Weighted Average Price)
     */
    function getTWAP(uint256 periods) public view returns (uint256) {
        require(periods > 0 && periods <= latestRound, "Invalid periods");

        uint256 sum = 0;
        uint256 startRound = latestRound - periods + 1;

        for (uint256 i = startRound; i <= latestRound; i++) {
            sum += priceHistory[i].price;
        }

        return sum / periods;
    }
}
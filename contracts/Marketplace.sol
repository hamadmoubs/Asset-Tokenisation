// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address user) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract Marketplace {
    struct Listing {
        uint256 id;
        address seller;
        uint256 amount;        // number of whole tokens listed
        uint256 pricePerToken; // price per token in wei (ETH)
        uint256 sold;          // number of whole tokens sold
        bool active;
    }

    IERC20 public token;
    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;

    // track per-seller data
    mapping(address => uint256[]) public sellerListings;

    uint256 public constant TOKEN_DECIMALS = 1e18;

    event Listed(uint256 id, address indexed seller, uint256 amount, uint256 pricePerToken);
    event Purchased(uint256 id, address indexed buyer, uint256 amount, uint256 totalPaid);
    event Deactivated(uint256 id);

    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
    }

    // list "amount" whole tokens for sale at "pricePerToken" wei each
    function listTokens(uint256 amount, uint256 pricePerToken) external {
        require(amount > 0, "amount=0");
        require(pricePerToken > 0, "price=0");

        uint256 amountWei = amount * TOKEN_DECIMALS;

        require(token.allowance(msg.sender, address(this)) >= amountWei, "approve tokens first");

        token.transferFrom(msg.sender, address(this), amountWei);

        listings[listingCount] = Listing({
            id: listingCount,
            seller: msg.sender,
            amount: amount,
            pricePerToken: pricePerToken,
            sold: 0,
            active: true
        });

        sellerListings[msg.sender].push(listingCount);
        emit Listed(listingCount, msg.sender, amount, pricePerToken);
        listingCount++;
    }

    // buy "amountToBuy" whole tokens from a listing
    function buy(uint256 id, uint256 amountToBuy) external payable {
        Listing storage l = listings[id];
        require(l.active, "not active");
        require(amountToBuy > 0 && amountToBuy <= l.amount - l.sold, "invalid amount");

        uint256 totalPrice = amountToBuy * l.pricePerToken;
        require(msg.value == totalPrice, "incorrect ETH");

        l.sold += amountToBuy;

        uint256 amountWei = amountToBuy * TOKEN_DECIMALS;
        token.transfer(msg.sender, amountWei);
        payable(l.seller).transfer(msg.value);

        emit Purchased(id, msg.sender, amountToBuy, totalPrice);

        if (l.sold == l.amount) {
            l.active = false;
            emit Deactivated(id);
        }
    }

    // seller can deactivate listing
    function deactivate(uint256 id) external {
        Listing storage l = listings[id];
        require(l.seller == msg.sender, "not your listing");
        require(l.active, "already inactive");
        l.active = false;
        emit Deactivated(id);
    }

    // getters for frontend
    function getListingCount() external view returns (uint256) {
        return listingCount;
    }

    function getActiveListings() external view returns (Listing[] memory active) {
        uint256 count;
        for (uint256 i = 0; i < listingCount; i++) {
            if (listings[i].active) count++;
        }

        active = new Listing[](count);
        uint256 idx;
        for (uint256 i = 0; i < listingCount; i++) {
            if (listings[i].active) {
                active[idx++] = listings[i];
            }
        }
    }

    function getSellerListings(address seller) external view returns (Listing[] memory sellerItems) {
        uint256[] storage ids = sellerListings[seller];
        sellerItems = new Listing[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            sellerItems[i] = listings[ids[i]];
        }
    }
}

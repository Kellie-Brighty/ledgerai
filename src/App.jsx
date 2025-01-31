import React, { useState, useEffect, useRef } from "react";
import "./index.css";
import Avatar from "./assets/avatar.svg";
import BackgroundImage from "./assets/bg.jpg";

const DogAITerminal = () => {
  const [address, setAddress] = useState("");
  const [dogais, setDogais] = useState(0);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingIndex, setCurrentTypingIndex] = useState(-1);
  const [showImage, setShowImage] = useState(false);
  const [output, setOutput] = useState([
    "🤖 Ledger AI: Ask me anything about XRP Ledger",
    "",
    "ℹ️ Type 'help' to see available commands",
  ]);
  const outputRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    setTimeout(() => {
      setAddress("000000000000000000000");
    }, 1000);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processCommand(input);
      setInput("");
    }
  };

  const clearOutput = () => {
    setOutput([]);
    setShowImage(false);
  };

  const typeResponse = (response) => {
    setIsTyping(true);
    setCurrentTypingIndex(0);

    const typeChar = (index) => {
      if (index < response.length) {
        setOutput((prev) => {
          const lastLine = prev[prev.length - 1];

          // Handle line breaks
          if (response[index] === "\n") {
            return [...prev.slice(0, -1), lastLine, ""];
          }

          return [...prev.slice(0, -1), lastLine + response[index]];
        });
        setTimeout(() => typeChar(index + 1), 25); // Slightly faster typing speed
      } else {
        setIsTyping(false);
        setCurrentTypingIndex(-1);

        // If the response contains a link, replace the text with a clickable link
        if (response.includes("https://")) {
          const lines = response.split("\n");
          const updatedLines = lines.map((line) => {
            if (line.includes("https://")) {
              const parts = line.split(" ");
              const link = parts.pop();
              const text = parts.join(" ");
              return (
                <span>
                  {text}{" "}
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {link}
                  </a>
                </span>
              );
            }
            return line;
          });
          setOutput((prev) => [
            ...prev.slice(0, -updatedLines.length),
            ...updatedLines,
          ]);
        }
      }
    };

    typeChar(0);
  };

  const fetchXRPInfo = async (xrpAddress) => {
    try {
      // Basic validation of XRP address format
      if (!xrpAddress.match(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)) {
        return "❌ Invalid XRP address format. XRP addresses start with 'r' and are 25-34 characters long.";
      }

      const response = await fetch(
        `https://api.xrpscan.com/api/v1/account/${xrpAddress}`
      );
      const data = await response.json();
      console.log("data:::", data);

      if (data.error) {
        return `❌ Error: ${data.error}`;
      }

      const xrpBalance = (Number(data.xrpBalance) / 100000).toFixed(6);

      // Create the response with a clickable transaction link and better formatting
      return `
🔍 XRP Account Information
━━━━━━━━━━━━━━━━━━━━━━━━

👛 Address: ${data.Account}

💰 Balance: ${xrpBalance} XRP

🔄 Latest Transaction:
${data.PreviousTxnID}
➜ View on Explorer: https://xrpscan.com/tx/${data.PreviousTxnID}
━━━━━━━━━━━━━━━━━━━━━━━━`;
    } catch (error) {
      console.error("Error fetching XRP info:", error);
      return "❌ Error fetching XRP account information. Please try again.";
    }
  };

  const fetchContractInfo = async (contractAddress) => {
    try {
      const response = await fetch(
        `https://api.firstledger.info/api/v1/contracts/${contractAddress}`
      );
      const data = await response.json();
      console.log("Contract data:", data);

      if (data.error) {
        return `❌ Error: ${data.error}`;
      }

      return `
📄 Contract Information
━━━━━━━━━━━━━━━━━━━━

📍 Address: ${contractAddress}

ℹ️ Details:
  • Name: ${data.name || "N/A"}
  • Symbol: ${data.symbol || "N/A"}
  • Supply: ${data.totalSupply || "N/A"}
  • Decimals: ${data.decimals || "N/A"}

👤 Creator: ${data.creator || "N/A"}

📅 Created: ${
        data.createdAt ? new Date(data.createdAt).toLocaleString() : "N/A"
      }
${data.website ? `\n🌐 Website: ${data.website}` : ""}
━━━━━━━━━━━━━━━━━━━━`;
    } catch (error) {
      console.error("Error fetching contract info:", error);
      return "❌ Error fetching contract information. Please try again.";
    }
  };

  const fetchTokenInfo = async (issuerAddress) => {
    try {
      if (!issuerAddress.match(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)) {
        return "❌ Invalid issuer address format. Addresses start with 'r' and are 25-34 characters long.";
      }

      const ws = new WebSocket("wss://xrplcluster.com/");

      // Get both account_lines and account_info
      const response = await Promise.all([
        new Promise((resolve, reject) => {
          ws.onopen = () => {
            ws.send(
              JSON.stringify({
                command: "account_lines",
                account: issuerAddress,
                ledger_index: "validated",
                limit: 400,
              })
            );
          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            resolve(data);
          };

          ws.onerror = (error) => reject(error);
        }),
        new Promise((resolve, reject) => {
          const ws2 = new WebSocket("wss://xrplcluster.com/");
          ws2.onopen = () => {
            ws2.send(
              JSON.stringify({
                command: "account_info",
                account: issuerAddress,
                ledger_index: "validated",
              })
            );
          };

          ws2.onmessage = (event) => {
            const data = JSON.parse(event.data);
            resolve(data);
            ws2.close();
          };

          ws2.onerror = (error) => {
            reject(error);
            ws2.close();
          };
        }),
      ]);

      const [linesData, accountData] = response;
      console.log("Token data:", linesData);
      console.log("Account data:", accountData);

      if (linesData.error) {
        return `❌ Error: ${linesData.error_message || linesData.error}`;
      }

      const lines = linesData.result.lines;
      if (!lines || lines.length === 0) {
        return `❌ No tokens found for this issuer address.`;
      }

      const accountInfo = accountData.result.account_data;
      const accountFlags = {
        requireAuth: (accountInfo.Flags & 0x00100000) !== 0,
        freezeEnabled: (accountInfo.Flags & 0x00200000) !== 0,
        globalFreeze: (accountInfo.Flags & 0x00400000) !== 0,
        noFreeze: (accountInfo.Flags & 0x00800000) !== 0,
      };

      // Group tokens by currency with enhanced information
      const tokens = lines.reduce((acc, line) => {
        if (!acc[line.currency]) {
          acc[line.currency] = {
            currency: line.currency,
            balance: parseFloat(line.balance),
            trustlines: 1,
            quality_in: line.quality_in || "N/A",
            quality_out: line.quality_out || "N/A",
            no_ripple: line.no_ripple || false,
            freeze: line.freeze || false,
            authorized: line.authorized || false,
            limit: line.limit || "No limit",
          };
        } else {
          acc[line.currency].trustlines++;
          acc[line.currency].balance += parseFloat(line.balance);
        }
        return acc;
      }, {});

      return `
📄 XRPL Issuer Contract
━━━━━━━━━━━━━━━━━━━━

📍 Address: ${issuerAddress}

💰 Account Details:
  • Balance: ${accountInfo.Balance / 1000000} XRP
  • Sequence: ${accountInfo.Sequence}
  • Previous TxnID: ${accountInfo.PreviousTxnID}

🔒 Security Settings:
  • Requires Auth: ${accountFlags.requireAuth ? "Yes" : "No"}
  • Freeze Enabled: ${accountFlags.freezeEnabled ? "Yes" : "No"}
  • Global Freeze: ${accountFlags.globalFreeze ? "Yes" : "No"}
  • No Freeze: ${accountFlags.noFreeze ? "Yes" : "No"}

💎 Issued Tokens (${Object.keys(tokens).length}):
${Object.entries(tokens)
  .map(
    ([currency, data]) => `  • ${currency}
    Total Supply: ${data.balance}
    Trustlines: ${data.trustlines}
    Quality In/Out: ${data.quality_in}/${data.quality_out}
    Limit: ${data.limit}
    Features: ${
      [
        data.no_ripple ? "No Ripple" : "",
        data.freeze ? "Frozen" : "",
        data.authorized ? "Authorized" : "",
      ]
        .filter(Boolean)
        .join(", ") || "None"
    }`
  )
  .join("\n\n")}

🔗 View Contract:
  • XRPL Explorer: https://livenet.xrpl.org/accounts/${issuerAddress}
  • XRPScan: https://xrpscan.com/account/${issuerAddress}
  • Bithomp: https://bithomp.com/explorer/${issuerAddress}

🔄 View Latest Transaction:
  • https://xrpscan.com/tx/${accountInfo.PreviousTxnID}
━━━━━━━━━━━━━━━━━━━━━`;
    } catch (error) {
      console.error("Error fetching token info:", error);
      return "❌ Error fetching contract information. Please try again.";
    }
  };

  const processCommand = async (cmd) => {
    setOutput((prev) => [...prev, `> ${cmd}`]);
    let response = "";

    // Split command into parts for commands with parameters
    const parts = cmd.split(" ");
    const command = parts[0].toLowerCase();
    const parameter = parts.slice(1).join(" ");

    switch (command) {
      case "help":
        response = `
📚 Available Commands
━━━━━━━━━━━━━━━━━━

❓  help - Show this help message
📋  ca (or address) - Show contract address for Ledger AI
🐦  twitter - Get Twitter link for Ledger AI
💬  telegram - Get Telegram link for Ledger AI
🧹  clear (or cls) - Clear terminal
💎  addressinfo <address-to-check> - Simple XRP address lookup

🪙  <address-to-scan> - Much detailed XRP address lookup

💡 Any other input will be sent to AI for a response.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        break;

      case "address":
      case "ca":
        response = `
📋 Contract Address
━━━━━━━━━━━━━━━━━

🔑 ${address}
━━━━━━━━━━━━━━━━━`;
        break;

      case "telegram":
        response = `
💬 Telegram Community
━━━━━━━━━━━━━━━━━━

➜ Join us: https://t.me/LedgerAIXRP
━━━━━━━━━━━━━━━━━━`;
        break;

      case "twitter":
        response = `
🐦 Twitter Profile
━━━━━━━━━━━━━━━

➜ Follow us: https://x.com/ledgeraionxrp
━━━━━━━━━━━━━━━━━━`;
        break;

      case "addressinfo":
        if (!parameter) {
          response = `
❌ Missing Address
━━━━━━━━━━━━━━━

Usage: xrp <address>
Example: xrp rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        } else {
          setOutput((prev) => [...prev, ""]);
          typeResponse("🔍 Fetching XRP address information...");
          response = await fetchXRPInfo(parameter);
        }
        break;

      case "scan":
        if (!parameter) {
          response = `
❌ Missing Address
━━━━━━━━━━━━━━━

Usage: token <issuer_address>
Example: token rHEwCxE7GHjwXEpZwPSHLqh4Qf1N6C8M9N

Note: First-time users need to request access at:
https://cors-anywhere.herokuapp.com/corsdemo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        } else {
          setOutput((prev) => [...prev, ""]);
          typeResponse("🔍 Fetching token information...");
          response = await fetchTokenInfo(parameter);
        }
        break;

      case "clear":
      case "cls":
        clearOutput();
        return;

      default:
        // Check if input is an XRP address
        if (cmd.match(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)) {
          setOutput((prev) => [...prev, ""]);
          typeResponse("🔍 Scanning XRP address...");
          response = await fetchTokenInfo(cmd);
          if (response) {
            setOutput((prev) => [...prev.slice(0, -1), ""]);
            typeResponse(response);
          }
          return;
        }

        // If not an XRP address, proceed with AI chat
        setOutput((prev) => [...prev, ""]);
        typeResponse("🤔 Thinking...");
        await chatWithAI(cmd);
        return;
    }

    if (response) {
      setOutput((prev) => [...prev.slice(0, -1), ""]);
      typeResponse(response);
    }
  };

  const chatWithAI = async (message) => {
    setOutput((prev) => [...prev, ""]);
    typeResponse("Thinking...");

    console.log("API key:::", import.meta.env.VITE_OPENAI_API_KEY)

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: message }],
          }),
        }
      );

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      setOutput((prev) => [...prev.slice(0, -1), ""]);
      typeResponse(aiResponse);
    } catch (error) {
      console.error("Error:", error);
      setOutput((prev) => [...prev.slice(0, -1)]);
      typeResponse("Sorry, I couldn't process your request. Please try again.");
    }
  };

  useEffect(() => {
    inputRef.current.focus();
  }, [output]);

  return (
    <div className="min-h-screen font-mono relative">
      {/* Content wrapper */}
      <div className="bg-[#2D0A42] min-h-screen flex items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-[800px] p-4 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-2 text-white">
            <div className="text-xl font-bold mb-4 sm:mb-0">Ledger AI</div>
            <div className="flex gap-4">
              <a
                href="https://x.com/ledgeraionxrp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white transition-colors duration-300 hover:text-[#E2C400]"
              >
                [x]
              </a>
              <a
                href="https://t.me/LedgerAIXRP"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white transition-colors duration-300 hover:text-[#E2C400]"
              >
                [telegram]
              </a>
              <a
                href="#"
                className="text-white transition-colors duration-300 hover:text-[#E2C400]"
              >
                [chart]
              </a>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-4 sm:gap-8 mb-4">
            <div className="flex-1">
              <p className="text-white text-sm sm:text-base mb-4">
                Ledger AI, born from First Ledger's iconic liquidity-providing
                trading platform for XRP Ledger tokens, is your first-ever
                AI-human companion on the XRP chain. Ready to answer any human
                or XRP chain-related questions in one go. Try Ledger AI today
                below.
              </p>
            </div>
            <div className="flex-none flex justify-center sm:block">
              <img
                src={Avatar}
                alt="AI Avatar"
                className="w-[200px] h-[200px] sm:w-[400px] sm:h-[400px]"
              />
            </div>
          </div>

          <div className="bg-[#1A0626] border border-[#E2C400] rounded-lg p-3 sm:p-4 h-[400px] sm:h-[500px] flex flex-col">
            <div className="text-[#FFD700] mb-2 text-xs sm:text-sm">
              Ledger_AI.exe
            </div>
            <div
              ref={terminalRef}
              className="text-white mb-4 flex-1 overflow-y-auto scrollbar-custom scroll-smooth"
            >
              {output.map((line, index) => (
                <p
                  key={index}
                  className="mb-1 text-sm sm:text-base break-words"
                >
                  {line}
                </p>
              ))}
            </div>
            <div className="flex items-center text-white">
              <span className="mr-2 text-sm sm:text-base">&gt;&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="bg-transparent outline-none flex-grow w-full text-sm sm:text-base"
                placeholder="Ask me anything about XRP Ledger."
                disabled={isTyping}
              />
              <span className="animate-blink text-sm sm:text-base">
                &gt;&gt;
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DogAITerminal;

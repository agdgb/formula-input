import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";
import { Input } from "@/components/ui/input";
import { evaluate } from "mathjs";

// Zustand store for managing formula tokens
const useFormulaStore = create((set) => ({
  tokens: [], // Array to store formula tokens (values and operators)
  setTokens: (tokens) => set({ tokens }), // Function to update tokens
  addToken: (token) => set((state) => ({ tokens: [...state.tokens, token] })), // Function to add a token
  removeToken: (index) =>
    set((state) => ({
      tokens: state.tokens.filter((_, i) => i !== index), // Function to remove a token by index
    })),
}));

// Fetch autocomplete suggestions from the API
const fetchSuggestions = async (query) => {
  if (!query) return []; // Return empty array if query is empty

  const response = await fetch(
    `https://652f91320b8d8ddac0b2b62b.mockapi.io/autocomplete`
  );

  if (!response.ok) {
    console.error("Error fetching suggestions");
    return []; // Return empty array on fetch error
  }

  const data = await response.json();
  return data.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()) // Filter suggestions based on query
  );
};

function App() {
  const { tokens, addToken, removeToken } = useFormulaStore(); // Access Zustand store
  const [inputValue, setInputValue] = useState(""); // State for input field value
  const [showInput, setShowInput] = useState(false); // State to control input visibility
  const inputRef = useRef(null); // Ref for the input field
  const { data: suggestions } = useQuery({
    queryKey: ["autocomplete", inputValue], // Query key for caching
    queryFn: () => fetchSuggestions(inputValue), // Fetch suggestions based on input value
    enabled: !!inputValue, // Enable query only if inputValue is not empty
  });

  const operators = ["+", "-", "*", "/", "^", "(", ")"]; // List of valid operators

  // Focus the input field when it becomes visible or when tokens are updated
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput, tokens]);

  // Handle keydown events in the input field
  const handleKeyDown = (e) => {
    // Handle operator keys
    if (operators.includes(e.key)) {
      e.preventDefault(); // Prevent default behavior (e.g., typing the operator in the input)

      const lastToken = tokens[tokens.length - 1];
      if (lastToken && operators.includes(lastToken.value)) {
        // If the last token is also an operator, do nothing
        return;
      }

      // Add the operator as a token
      addToken({ type: "operator", value: e.key });
      setInputValue(""); // Clear the input field
      setShowInput(true); // Keep the input visible
      return;
    }

    // Handle space key
    if (e.key === " ") {
      e.preventDefault(); // Prevent default space behavior

      if (inputValue.trim()) {
        // Add the current input as a value token
        addToken({ type: "value", name: inputValue, value: inputValue });
        setInputValue(""); // Clear the input field
        setShowInput(true); // Keep the input visible
      }
      return;
    }

    // Handle backspace key
    if (e.key === "Backspace" && !inputValue && tokens.length) {
      removeToken(tokens.length - 1); // Remove the last token
      return;
    }

    // Handle enter key
    if (e.key === "Enter") {
      if (inputValue.trim()) {
        // Add the current input as a value token
        addToken({ type: "value", name: inputValue, value: inputValue });
        setInputValue(""); // Clear the input field
        setShowInput(true); // Keep the input visible
      }
      return;
    }
  };

  // Handle selection of autocomplete suggestions
  const handleSelectSuggestion = (suggestion) => {
    addToken({ type: "value", name: suggestion.name, value: suggestion.value }); // Store both name and value
    setInputValue(""); // Clear input field after selection
    setShowInput(true); // Keep input visible
    if (inputRef.current) {
      inputRef.current.focus(); // Focus the input after selection
    }
  };

  // Convert tokens into a string formula for evaluation
  const formulaString = tokens
    .map((token) => {
      if (token.type === "value") {
        return token.value; // Use the value for formula evaluation
      } else {
        return token.value; // Use the operator directly
      }
    })
    .join(" ");

  // Compute the result if it's a valid expression
  let result = "Invalid Expression"; // Default result

  try {
    console.log(formulaString);
    result = evaluate(formulaString); // Evaluate the formula using math.js
  } catch (e) {
    // Check for specific errors or provide a generic error message
    if (e instanceof SyntaxError) {
      result = "Syntax Error: Please check your formula.";
    } else if (e instanceof TypeError) {
      result = "Type Error: Invalid input or formula type.";
    } else {
      result = `Error: ${e.message}`; // General error message
    }
  }

  return (
    <div className="border p-4 rounded-lg w-full max-w-md">
      {/* Formula Input Area */}
      <div
        className="flex items-center gap-2 border-b pb-2 flex-wrap min-h-10 cursor-text"
        onClick={() => setShowInput(true)} // Show input when the area is clicked
      >
        {/* Display Tokens as Chips */}
        {tokens.map((token, index) => (
          <div
            key={index}
            className="px-1 py-1 bg-gray-100 rounded-md flex items-center gap-1 text-sm"
          >
            <span>{token.type === "value" ? token.name : token.value}</span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the parent onClick
                removeToken(index); // Remove the token on button click
              }}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        ))}

        {/* Dynamic Input Field */}
        {showInput && (
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a formula..."
            className="flex-grow"
          />
        )}
      </div>

      {/* Autocomplete Suggestions */}
      {suggestions?.length > 0 && (
        <div className="border mt-2 p-2 bg-white shadow-md rounded-md">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="p-1 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelectSuggestion(s)}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}

      {/* Computed Result */}
      <div className="mt-3 p-2 bg-gray-100 rounded-md">
        <strong>Result: </strong> {result}
      </div>
    </div>
  );
}

export default App;
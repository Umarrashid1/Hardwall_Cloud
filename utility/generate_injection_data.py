import pandas as pd
import random

# List of commonly used keystroke injection words and patterns
injection_patterns = [
    "bash", "cmd", "curl", "wget", "nc", "powershell", "chmod", "echo", "eval", "exec",
    "system", "os.system", "sh", "kali", "msfvenom", "reverse_shell", "base64", "decode",
    "python", "perl", "ruby", "php", "tcp", "udp", "0>&1", "2>&1", "&", "|", "||", ";", "&&",
    "0x", "../", "/bin/bash", "/bin/sh", "/etc/passwd", "/usr/bin/", "/usr/local/", "/dev/tcp",
    "/dev/null", "mkfifo", "cat", "rm", "mv", "cp", "ls", "pwd", "whoami", "id", "uname",
    "env", "find", "grep", "awk", "ssh", "sed", "xargs", "nohup", "exit", "kill", "sleep", "set",
    "unset", "read", "print", "printf", "strcpy", "scanf", "buffer", "overflow", "stack",
    "heap", "pointer", "malloc", "free", "fork", "execve", "int", "char", "%x", "%s", "%n",
    "{{", "}}", "<script>", "</script>", "SELECT", "DROP", "INSERT", "UPDATE", "UNION", "--",
    "/*", "*/", "'", "\"", "$", "@", "#", "!", "run", "open", "close", "write", "read", "create", "admin", "password",
    "su", "sudo", "ftp", "scp", "telnet", "python3", "ruby", "java", "javac", "gcc", "g++",
    "dd", "tar", "gzip", "gunzip", "unzip", "curl -O", "scp", "wget -O", "alias", "unalias",
    "ifconfig", "ipconfig", "ping", "traceroute", "nmap", "dig", "dns", "proxy", "reverse",
    "/../", "\\..\\", "%2e%2e%2f", "%252e%252e%252f", "../../../../", "..%c0%af", "..%2f",
    "`", "$()", "$(())", "\"`\"", "`\"", "\\`", "${}", "<<", ">>", ">&", "<&", ">|", "^", "`&&`",
    "eval(", "exec(", "import", "from", "subprocess", "popen", "input(", "pickle", "__import__",
    "' OR 1=1", "\" OR \"\"=\"", "OR 1=1", "1' OR '1", "' DROP TABLE", "' UNION SELECT",
    "document.cookie", "window.location", "alert(", "onerror=", "onload=", "onclick=",
    "<img src=", "javascript:", "<iframe>", "<div>", "<span>",
    "<body>", "<head>", "<link>", "<form>", "<input>", "<textarea>", "<style>", "<?xml",
    "%%", "%u", "%0a", "%0d", "%09", "%00", "0x0", "%3c", "%3e", "%3d", "%27", "%22",
    "sqlmap", "hydra", "john", "burp", "ngrok", "reGeorg", "Cobalt Strike", "Empire",
    "Meterpreter", "EmpireC2", "C2",
    "<svg>", "<marquee>", "prompt(", "src=", "onmouseover=", "style=", "href=", "data:",
    "<!--", "-->", "</>", "]]>",
    "useradd", "usermod", "passwd", "chage", "groupadd", "groupdel", "chown", "chmod",
    "stderr", "stdout", "stderr_log", "error_log", "access_log", "debug",
    "shell_exec", "passthru", "proc_open", "popen", "dl", "dlopen", "system(", "exec(",
    "pcntl_exec", "unlink", "file_put_contents", "file_get_contents", "base64_encode",
    "base64_decode", "ROT13", "eval(base64_decode"
]


# Function to generate synthetic keystroke injection attack data
def generate_injection_attack_dataset(num_rows):
    data = []

    # Define a list of valid VK codes as per Windows API, covering all symbols and special characters
    valid_vk_codes = [
        0x08, 0x09, 0x0D, 0x10, 0x11, 0x12, 0x13, 0x14, 0x1B, 0x20, 0x21, 0x22, 0x23,
        0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30,
        0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D,
        0x3E, 0x3F, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A,
        0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57,
        0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F, 0x60, 0x61, 0x62, 0x63, 0x64,
        0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F, 0x70, 0x71,
        0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E,
        0x90, 0x91, 0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE,
        0xBF, 0xC0, 0xDB, 0xDC, 0xDD, 0xDE, 0xE2
    ]

    # Initialize the current pattern and character index
    current_pattern = random.choice(injection_patterns)
    char_index = 0

    for _ in range(num_rows):
        # Reset the pattern if it's fully typed out
        if char_index >= len(current_pattern):
            current_pattern = random.choice(injection_patterns)
            char_index = 0

        # Get the current character and its VK (ASCII code)
        char = current_pattern[char_index]
        vk = ord(char)

        # If the VK is not valid, map it to the closest valid VK code
        if vk not in valid_vk_codes:
            vk = random.choice(valid_vk_codes)

        # Move to the next character in the pattern for the next row
        char_index += 1

        # Generate random HT (hold time) and FT (flight time)
        ht = random.randint(1, 3)
        ft = random.choices([random.randint(150, 500), random.randint(1, 5)], weights=[0.1, 0.9])[0]
        # Assign label 1 to indicate keystroke injection attack
        label = 1

        data.append((vk, ht, ft, label))

    return pd.DataFrame(data, columns=["VK", "HT", "FT", "Injection"])

# Generate the dataset
num_rows = 1372344
injection_attack_dataset = generate_injection_attack_dataset(num_rows)

# Save to CSV
file_path = "injection_attack_data.csv"
injection_attack_dataset.to_csv(file_path, index=False)
print(f"Dataset saved to {file_path}")